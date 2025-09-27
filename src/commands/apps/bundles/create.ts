import { MAX_CONCURRENT_UPLOADS } from '@/config/index.js';
import appBundleFilesService from '@/services/app-bundle-files.js';
import appBundlesService from '@/services/app-bundles.js';
import appsService from '@/services/apps.js';
import authorizationService from '@/services/authorization-service.js';
import organizationsService from '@/services/organizations.js';
import { AppBundleFileDto } from '@/types/app-bundle-file.js';
import {
  createBufferFromPath,
  createBufferFromReadStream,
  createBufferFromString,
  isPrivateKeyContent,
} from '@/utils/buffer.js';
import { fileExistsAtPath, getFilesInDirectoryAndSubdirectories, isDirectory } from '@/utils/file.js';
import { createHash } from '@/utils/hash.js';
import { generateManifestJson } from '@/utils/manifest.js';
import { formatPrivateKey } from '@/utils/private-key.js';
import { prompt } from '@/utils/prompt.js';
import { createSignature } from '@/utils/signature.js';
import zip from '@/utils/zip.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { createReadStream } from 'fs';
import { hasTTY, isCI } from 'std-env';
import { z } from 'zod';

export default defineCommand({
  description: 'Create a new app bundle.',
  options: defineOptions(
    z.object({
      androidMax: z.coerce
        .string()
        .optional()
        .describe('The maximum Android version code (`versionCode`) that the bundle supports.'),
      androidMin: z.coerce
        .string()
        .optional()
        .describe('The minimum Android version code (`versionCode`) that the bundle supports.'),
      appId: z
        .string({
          message: 'App ID must be a UUID.',
        })
        .uuid({
          message: 'App ID must be a UUID.',
        })
        .optional()
        .describe('App ID to deploy to.'),
      artifactType: z
        .enum(['manifest', 'zip'], {
          message: 'Invalid artifact type. Must be either `manifest` or `zip`.',
        })
        .optional()
        .describe('The type of artifact to deploy. Must be either `manifest` or `zip`. The default is `zip`.')
        .default('zip'),
      channel: z.string().optional().describe('Channel to associate the bundle with.'),
      commitMessage: z.string().optional().describe('The commit message related to the bundle.'),
      commitRef: z.string().optional().describe('The commit ref related to the bundle.'),
      commitSha: z.string().optional().describe('The commit sha related to the bundle.'),
      customProperty: z
        .array(z.string().min(1).max(100))
        .optional()
        .describe(
          'A custom property to assign to the bundle. Must be in the format `key=value`. Can be specified multiple times.',
        ),
      expiresInDays: z.coerce
        .number({
          message: 'Expiration days must be an integer.',
        })
        .int({
          message: 'Expiration days must be an integer.',
        })
        .optional()
        .describe('The number of days until the bundle is automatically deleted.'),
      iosMax: z
        .string()
        .optional()
        .describe('The maximum iOS bundle version (`CFBundleVersion`) that the bundle supports.'),
      iosMin: z
        .string()
        .optional()
        .describe('The minimum iOS bundle version (`CFBundleVersion`) that the bundle supports.'),
      path: z
        .string()
        .optional()
        .describe('Path to the bundle to upload. Must be a folder (e.g. `www` or `dist`) or a zip file.'),
      privateKey: z
        .string()
        .optional()
        .describe(
          'The private key to sign the bundle with. Can be a file path to a .pem file or the private key content as plain text.',
        ),
      rollout: z.coerce
        .number()
        .min(0)
        .max(1, {
          message: 'Rollout percentage must be a number between 0 and 1 (e.g. 0.5).',
        })
        .optional()
        .default(1)
        .describe('The percentage of devices to deploy the bundle to. Must be a number between 0 and 1 (e.g. 0.5).'),
      url: z.string().optional().describe('The url to the self-hosted bundle file.'),
    }),
  ),
  action: async (options, args) => {
    let {
      androidMax,
      androidMin,
      appId,
      artifactType,
      channel,
      commitMessage,
      commitRef,
      commitSha,
      customProperty,
      expiresInDays,
      iosMax,
      iosMin,
      path,
      privateKey,
      rollout,
      url,
    } = options;

    // Check if the user is logged in
    if (!authorizationService.hasAuthorizationToken()) {
      consola.error('You must be logged in to run this command.');
      process.exit(1);
    }
    // Calculate the expiration date
    let expiresAt: string | undefined;
    if (expiresInDays) {
      const expiresAtDate = new Date();
      expiresAtDate.setDate(expiresAtDate.getDate() + expiresInDays);
      expiresAt = expiresAtDate.toISOString();
    }
    // Check that either a path or a url is provided
    if (!path && !url) {
      if (isCI) {
        consola.error('You must provide either a path or a url when running in CI mode.');
        process.exit(1);
      } else {
        path = await prompt('Enter the path to the app bundle:', {
          type: 'text',
        });
        if (!path) {
          consola.error('You must provide a path to the app bundle.');
          process.exit(1);
        }
      }
    }
    if (path) {
      // Check if the path exists when a path is provided
      const pathExists = await fileExistsAtPath(path);
      if (!pathExists) {
        consola.error(`The path does not exist.`);
        process.exit(1);
      }
      // Check if the directory contains an index.html file
      const pathIsDirectory = await isDirectory(path);
      if (pathIsDirectory) {
        const files = await getFilesInDirectoryAndSubdirectories(path);
        const indexHtml = files.find((file) => file.href === 'index.html');
        if (!indexHtml) {
          consola.error('The directory must contain an `index.html` file.');
          process.exit(1);
        }
      } else if (zip.isZipped(path)) {
        // No-op
      } else {
        consola.error('The path must be either a folder or a zip file.');
        process.exit(1);
      }
    }
    // Check that the path is a directory when creating a bundle with an artifact type
    if (artifactType === 'manifest' && path) {
      const pathIsDirectory = await isDirectory(path);
      if (!pathIsDirectory) {
        consola.error('The path must be a folder when creating a bundle with an artifact type of `manifest`.');
        process.exit(1);
      }
    }
    // Check that a URL is not provided when creating a bundle with an artifact type of manifest
    if (artifactType === 'manifest' && url) {
      consola.error(
        'It is not yet possible to provide a URL when creating a bundle with an artifact type of `manifest`.',
      );
      process.exit(1);
    }
    if (!appId) {
      if (isCI) {
        consola.error('You must provide an app ID when running in CI mode.');
        process.exit(1);
      }
      const organizations = await organizationsService.findAll();
      if (organizations.length === 0) {
        consola.error('You must create an organization before creating a bundle.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      const organizationId = await prompt('Select the organization of the app for which you want to create a bundle.', {
        type: 'select',
        options: organizations.map((organization) => ({ label: organization.name, value: organization.id })),
      });
      if (!organizationId) {
        consola.error('You must select the organization of an app for which you want to create a bundle.');
        process.exit(1);
      }
      const apps = await appsService.findAll({
        organizationId,
      });
      if (apps.length === 0) {
        consola.error('You must create an app before creating a bundle.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      appId = await prompt('Which app do you want to deploy to:', {
        type: 'select',
        options: apps.map((app) => ({ label: app.name, value: app.id })),
      });
      if (!appId) {
        consola.error('You must select an app to deploy to.');
        process.exit(1);
      }
    }
    if (!channel && hasTTY) {
      const promptChannel = await prompt('Do you want to deploy to a specific channel?', {
        type: 'select',
        options: ['Yes', 'No'],
      });
      if (promptChannel === 'Yes') {
        channel = await prompt('Enter the channel name:', {
          type: 'text',
        });
        if (!channel) {
          consola.error('The channel name must be at least one character long.');
          process.exit(1);
        }
      }
    }
    // Create the private key buffer
    let privateKeyBuffer: Buffer | undefined;
    if (privateKey) {
      if (isPrivateKeyContent(privateKey)) {
        // Handle plain text private key content
        const formattedPrivateKey = formatPrivateKey(privateKey);
        privateKeyBuffer = createBufferFromString(formattedPrivateKey);
      } else if (privateKey.endsWith('.pem')) {
        // Handle file path
        const fileExists = await fileExistsAtPath(privateKey);
        if (fileExists) {
          const keyBuffer = await createBufferFromPath(privateKey);
          const keyContent = keyBuffer.toString('utf8');
          const formattedPrivateKey = formatPrivateKey(keyContent);
          privateKeyBuffer = createBufferFromString(formattedPrivateKey);
        } else {
          consola.error('Private key file not found.');
          process.exit(1);
        }
      } else {
        consola.error('Private key must be either a path to a .pem file or the private key content as plain text.');
        process.exit(1);
      }
    }

    let appBundleId: string | undefined;
    try {
      // Create the app bundle
      consola.start('Creating bundle...');
      let checksum: string | undefined;
      let signature: string | undefined;
      if (path && url) {
        // Create the file buffer
        if (!zip.isZipped(path)) {
          consola.error('The path must be a zip file when providing a URL.');
          process.exit(1);
        }
        const fileBuffer = await createBufferFromPath(path);
        // Generate checksum
        checksum = await createHash(fileBuffer);
        // Sign the bundle
        if (privateKeyBuffer) {
          signature = await createSignature(privateKeyBuffer, fileBuffer);
        }
      }
      const response = await appBundlesService.create({
        appId,
        artifactType,
        channelName: channel,
        checksum,
        gitCommitMessage: commitMessage,
        gitCommitRef: commitRef,
        gitCommitSha: commitSha,
        customProperties: parseCustomProperties(customProperty),
        expiresAt,
        url,
        maxAndroidAppVersionCode: androidMax,
        maxIosAppVersionCode: iosMax,
        minAndroidAppVersionCode: androidMin,
        minIosAppVersionCode: iosMin,
        rolloutPercentage: rollout,
        signature,
      });
      appBundleId = response.id;
      if (path) {
        if (url) {
          // Important: Do NOT upload files if the URL is provided.
          // The user wants to self-host the bundle. The path is only needed for code signing.
        } else {
          let appBundleFileId: string | undefined;
          // Upload the app bundle files
          if (artifactType === 'manifest') {
            await uploadFiles({ appId, appBundleId: response.id, path, privateKeyBuffer });
          } else {
            const result = await uploadZip({ appId, appBundleId: response.id, path, privateKeyBuffer });
            appBundleFileId = result.appBundleFileId;
          }
          // Update the app bundle
          consola.start('Updating bundle...');
          await appBundlesService.update({
            appBundleFileId,
            appId,
            artifactStatus: 'ready',
            appBundleId: response.id,
          });
        }
      }
      consola.success('Bundle successfully created.');
      consola.info(`Bundle ID: ${response.id}`);
    } catch (error) {
      if (appBundleId) {
        await appBundlesService.delete({ appId, appBundleId }).catch(() => {
          // No-op
        });
      }
      throw error;
    }
  },
});

const uploadFile = async (options: {
  appId: string;
  appBundleId: string;
  buffer: Buffer;
  href?: string;
  mimeType: string;
  name: string;
  privateKeyBuffer: Buffer | undefined;
  retryOnFailure?: boolean;
}): Promise<AppBundleFileDto> => {
  let { appId, appBundleId, buffer, href, mimeType, name, privateKeyBuffer, retryOnFailure } = options;

  try {
    // Generate checksum
    const hash = await createHash(buffer);
    // Sign the bundle
    let signature: string | undefined;
    if (privateKeyBuffer) {
      signature = await createSignature(privateKeyBuffer, buffer);
    }
    // Create the multipart upload
    return await appBundleFilesService.create({
      appId,
      appBundleId,
      buffer,
      checksum: hash,
      href,
      mimeType,
      name,
      signature,
    });
  } catch (error) {
    if (retryOnFailure) {
      return uploadFile({
        ...options,
        retryOnFailure: false,
      });
    }
    throw error;
  }
};

const uploadFiles = async (options: {
  appId: string;
  appBundleId: string;
  path: string;
  privateKeyBuffer: Buffer | undefined;
}) => {
  let { appId, appBundleId, path, privateKeyBuffer } = options;

  // Generate the manifest file
  await generateManifestJson(path);
  // Get all files in the directory
  const files = await getFilesInDirectoryAndSubdirectories(path);
  // Iterate over each file
  let fileIndex = 0;
  const uploadNextFile = async () => {
    if (fileIndex >= files.length) {
      return;
    }

    const file = files[fileIndex] as { href: string; mimeType: string; name: string; path: string };
    fileIndex++;

    consola.start(`Uploading file (${fileIndex}/${files.length})...`);
    const buffer = await createBufferFromPath(file.path);

    await uploadFile({
      appId,
      appBundleId: appBundleId,
      buffer,
      href: file.href,
      mimeType: file.mimeType,
      name: file.name,
      privateKeyBuffer: privateKeyBuffer,
      retryOnFailure: true,
    });
    await uploadNextFile();
  };

  const uploadPromises = Array.from({ length: MAX_CONCURRENT_UPLOADS });
  for (let i = 0; i < MAX_CONCURRENT_UPLOADS; i++) {
    uploadPromises[i] = uploadNextFile();
  }
  await Promise.all(uploadPromises);
};

const uploadZip = async (options: {
  appId: string;
  appBundleId: string;
  path: string;
  privateKeyBuffer: Buffer | undefined;
}): Promise<{ appBundleFileId: string }> => {
  let { appId, appBundleId, path, privateKeyBuffer } = options;

  // Read the zip file
  let fileBuffer;
  if (zip.isZipped(path)) {
    const readStream = createReadStream(path);
    fileBuffer = await createBufferFromReadStream(readStream);
  } else {
    consola.start('Zipping folder...');
    fileBuffer = await zip.zipFolder(path);
  }
  // Upload the zip file
  consola.start('Uploading file...');
  const result = await uploadFile({
    appId,
    appBundleId: appBundleId,
    buffer: fileBuffer,
    mimeType: 'application/zip',
    name: 'bundle.zip',
    privateKeyBuffer: privateKeyBuffer,
  });
  return {
    appBundleFileId: result.id,
  };
};

const parseCustomProperties = (customProperty: string[] | undefined): Record<string, string> | undefined => {
  let customProperties: Record<string, string> | undefined;
  if (customProperty) {
    customProperties = {};
    for (const property of customProperty) {
      const [key, value] = property.split('=');
      if (key && value) {
        customProperties[key] = value;
      }
    }
  }
  return customProperties;
};
