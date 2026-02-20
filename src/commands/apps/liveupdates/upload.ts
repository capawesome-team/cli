import { DEFAULT_CONSOLE_BASE_URL, MAX_CONCURRENT_UPLOADS } from '@/config/index.js';
import appBundleFilesService from '@/services/app-bundle-files.js';
import appBundlesService from '@/services/app-bundles.js';
import appsService from '@/services/apps.js';
import organizationsService from '@/services/organizations.js';
import { AppBundleFileDto } from '@/types/app-bundle-file.js';
import { withAuth } from '@/utils/auth.js';
import {
  createBufferFromPath,
  createBufferFromReadStream,
  createBufferFromString,
  isPrivateKeyContent,
} from '@/utils/buffer.js';
import { isInteractive } from '@/utils/environment.js';
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
import pathModule from 'path';
import { z } from 'zod';

export default defineCommand({
  description: 'Upload a bundle to Capawesome Cloud.',
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
      androidEq: z.coerce
        .string()
        .optional()
        .describe('The exact Android version code (`versionCode`) that the bundle does not support.'),
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
      commitMessage: z
        .string()
        .optional()
        .describe('The commit message related to the bundle. Deprecated, use `--git-ref` instead.'),
      commitRef: z
        .string()
        .optional()
        .describe('The commit ref related to the bundle. Deprecated, use `--git-ref` instead.'),
      commitSha: z
        .string()
        .optional()
        .describe('The commit sha related to the bundle. Deprecated, use `--git-ref` instead.'),
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
      gitRef: z
        .string()
        .optional()
        .describe('The Git reference (branch, tag, or commit SHA) to associate with the bundle.'),
      iosMax: z
        .string()
        .optional()
        .describe('The maximum iOS bundle version (`CFBundleVersion`) that the bundle supports.'),
      iosMin: z
        .string()
        .optional()
        .describe('The minimum iOS bundle version (`CFBundleVersion`) that the bundle supports.'),
      iosEq: z
        .string()
        .optional()
        .describe('The exact iOS bundle version (`CFBundleVersion`) that the bundle does not support.'),
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
      rolloutPercentage: z.coerce
        .number()
        .int({
          message: 'Percentage must be an integer.',
        })
        .min(0, {
          message: 'Percentage must be at least 0.',
        })
        .max(100, {
          message: 'Percentage must be at most 100.',
        })
        .optional()
        .describe('The percentage of devices to deploy the bundle to. Must be an integer between 0 and 100.'),
      yes: z.boolean().optional().describe('Skip confirmation prompt.'),
    }),
    { y: 'yes' },
  ),
  action: withAuth(async (options, args) => {
    let {
      androidEq,
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
      gitRef,
      iosEq,
      iosMax,
      iosMin,
      path,
      privateKey,
      rolloutPercentage,
    } = options;

    // Calculate the expiration date
    let expiresAt: string | undefined;
    if (expiresInDays) {
      const expiresAtDate = new Date();
      expiresAtDate.setDate(expiresAtDate.getDate() + expiresInDays);
      expiresAt = expiresAtDate.toISOString();
    }

    // Prompt for path if not provided
    if (!path) {
      if (!isInteractive()) {
        consola.error('You must provide a path when running in non-interactive environment.');
        process.exit(1);
      }
      consola.warn('Make sure you have built your web assets before uploading (e.g., `npm run build`).');
      path = await prompt('Enter the path to the web assets directory (e.g., `dist` or `www`):', {
        type: 'text',
      });
      if (!path) {
        consola.error('You must provide a path to the app bundle.');
        process.exit(1);
      }
    }

    // Validate the provided path
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

    // Check that the path is a directory when creating a bundle with an artifact type of manifest
    if (artifactType === 'manifest') {
      const pathIsDirectory = await isDirectory(path);
      if (!pathIsDirectory) {
        consola.error('The path must be a folder when creating a bundle with an artifact type of `manifest`.');
        process.exit(1);
      }
    }

    // Prompt for appId if not provided
    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
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

    // Prompt for channel if interactive
    if (!channel && !options.yes && isInteractive()) {
      const shouldDeployToChannel = await prompt('Do you want to deploy to a specific channel?', {
        type: 'confirm',
        initial: false,
      });
      if (shouldDeployToChannel) {
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

    // Get app details for confirmation
    const app = await appsService.findOne({ appId });
    const appName = app.name;

    // Final confirmation before uploading
    if (!options.yes && isInteractive()) {
      const relativePath = pathModule.relative(process.cwd(), path);
      const confirmed = await prompt(
        `Are you sure you want to upload a bundle from path "${relativePath}" for app "${appName}" (${appId})?`,
        {
          type: 'confirm',
        },
      );
      if (!confirmed) {
        consola.info('Bundle upload cancelled.');
        process.exit(0);
      }
    }

    // Create the app bundle
    consola.start('Creating bundle...');
    const response = await appBundlesService.create({
      appId,
      artifactType,
      channelName: channel,
      eqAndroidAppVersionCode: androidEq,
      eqIosAppVersionCode: iosEq,
      gitCommitMessage: commitMessage,
      gitCommitRef: commitRef,
      gitCommitSha: commitSha,
      gitRef,
      customProperties: parseCustomProperties(customProperty),
      expiresAt,
      maxAndroidAppVersionCode: androidMax,
      maxIosAppVersionCode: iosMax,
      minAndroidAppVersionCode: androidMin,
      minIosAppVersionCode: iosMin,
      // Convert percentage from 0-100 to 0-1 for API
      rolloutPercentage: (rolloutPercentage ?? 100) / 100,
    });

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

    consola.info(`Build Artifact ID: ${response.id}`);
    if (response.appDeploymentId) {
      consola.info(`Deployment URL: ${DEFAULT_CONSOLE_BASE_URL}/apps/${appId}/deployments/${response.appDeploymentId}`);
    }
    consola.success('Live Update successfully uploaded.');
  }),
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
