import { defineCommand } from 'citty';
import consola from 'consola';
import { createReadStream } from 'fs';
import { MAX_CONCURRENT_UPLOADS } from '../../../config';
import appBundleFilesService from '../../../services/app-bundle-files';
import appBundlesService from '../../../services/app-bundles';
import appsService from '../../../services/apps';
import authorizationService from '../../../services/authorization-service';
import { AppBundleFileDto } from '../../../types/app-bundle-file';
import { createBufferFromPath, createBufferFromReadStream } from '../../../utils/buffer';
import { getMessageFromUnknownError } from '../../../utils/error';
import { fileExistsAtPath, getFilesInDirectoryAndSubdirectories, isDirectory } from '../../../utils/file';
import { createHash } from '../../../utils/hash';
import { generateManifestJson } from '../../../utils/manifest';
import { prompt } from '../../../utils/prompt';
import { createSignature } from '../../../utils/signature';
import zip from '../../../utils/zip';

export default defineCommand({
  meta: {
    description: 'Create a new app bundle.',
  },
  args: {
    androidMax: {
      type: 'string',
      description: 'The maximum Android version code (`versionCode`) that the bundle supports.',
    },
    androidMin: {
      type: 'string',
      description: 'The minimum Android version code (`versionCode`) that the bundle supports.',
    },
    appId: {
      type: 'string',
      description: 'App ID to deploy to.',
    },
    artifactType: {
      type: 'string',
      description: 'The type of artifact to deploy. Must be either `manifest` or `zip`. The default is `zip`.',
    },
    channel: {
      type: 'string',
      description: 'Channel to associate the bundle with.',
    },
    commitMessage: {
      type: 'string',
      description: 'The commit message related to the bundle.',
    },
    commitRef: {
      type: 'string',
      description: 'The commit ref related to the bundle.',
    },
    commitSha: {
      type: 'string',
      description: 'The commit sha related to the bundle.',
    },
    customProperty: {
      type: 'string',
      description:
        'A custom property to assign to the bundle. Must be in the format `key=value`. Can be specified multiple times.',
    },
    expiresInDays: {
      type: 'string',
      description: 'The number of days until the bundle is automatically deleted.',
    },
    iosMax: {
      type: 'string',
      description: 'The maximum iOS bundle version (`CFBundleVersion`) that the bundle supports.',
    },
    iosMin: {
      type: 'string',
      description: 'The minimum iOS bundle version (`CFBundleVersion`) that the bundle supports.',
    },
    path: {
      type: 'string',
      description: 'Path to the bundle to upload. Must be a folder (e.g. `www` or `dist`) or a zip file.',
    },
    privateKey: {
      type: 'string',
      description: 'The path to the private key file to sign the bundle with.',
    },
    rollout: {
      type: 'string',
      description: 'The percentage of devices to deploy the bundle to. Must be a number between 0 and 1 (e.g. 0.5).',
    },
    url: {
      type: 'string',
      description: 'The url to the self-hosted bundle file.',
    },
  },
  run: async (ctx) => {
    if (!authorizationService.hasAuthorizationToken()) {
      consola.error('You must be logged in to run this command.');
      process.exit(1);
    }

    let androidMax = ctx.args.androidMax === undefined ? undefined : ctx.args.androidMax + ''; // Convert to string
    let androidMin = ctx.args.androidMin === undefined ? undefined : ctx.args.androidMin + ''; // Convert to string
    let appId = ctx.args.appId as string | undefined;
    let artifactType =
      ctx.args.artifactType === 'manifest' || ctx.args.artifactType === 'zip'
        ? ctx.args.artifactType
        : ('zip' as 'manifest' | 'zip');
    let channelName = ctx.args.channel as string | undefined;
    let customProperty = ctx.args.customProperty as string | string[] | undefined;
    let expiresInDays = ctx.args.expiresInDays === undefined ? undefined : ctx.args.expiresInDays + ''; // Convert to string
    let iosMax = ctx.args.iosMax === undefined ? undefined : ctx.args.iosMax + ''; // Convert to string
    let iosMin = ctx.args.iosMin === undefined ? undefined : ctx.args.iosMin + ''; // Convert to string
    let path = ctx.args.path as string | undefined;
    let privateKey = ctx.args.privateKey as string | undefined;
    let rolloutAsString = ctx.args.rollout === undefined ? undefined : ctx.args.rollout + ''; // Convert to string
    let url = ctx.args.url as string | undefined;
    let commitMessage = ctx.args.commitMessage as string | undefined;
    let commitRef = ctx.args.commitRef as string | undefined;
    let commitSha = ctx.args.commitSha as string | undefined;
    // Validate the expiration days
    let expiresAt: string | undefined;
    if (expiresInDays) {
      const expiresInDaysAsNumber = parseInt(expiresInDays, 10);
      if (isNaN(expiresInDaysAsNumber) || expiresInDaysAsNumber < 1) {
        consola.error('Expires in days must be a number greater than 0.');
        process.exit(1);
      }
      const expiresAtDate = new Date();
      expiresAtDate.setDate(expiresAtDate.getDate() + expiresInDaysAsNumber);
      expiresAt = expiresAtDate.toISOString();
    }
    // Validate the rollout percentage
    let rolloutPercentage = 1;
    if (rolloutAsString) {
      const rolloutAsNumber = parseFloat(rolloutAsString);
      if (isNaN(rolloutAsNumber) || rolloutAsNumber < 0 || rolloutAsNumber > 1) {
        consola.error('Rollout percentage must be a number between 0 and 1.');
        process.exit(1);
      }
      rolloutPercentage = rolloutAsNumber;
    }
    // Check that either a path or a url is provided
    if (!path && !url) {
      path = await prompt('Enter the path to the app bundle:', {
        type: 'text',
      });
      if (!path) {
        consola.error('You must provide a path to the app bundle.');
        process.exit(1);
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
      const apps = await appsService.findAll();
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
    if (!channelName) {
      const promptChannel = await prompt('Do you want to deploy to a specific channel?', {
        type: 'select',
        options: ['Yes', 'No'],
      });
      if (promptChannel === 'Yes') {
        channelName = await prompt('Enter the channel name:', {
          type: 'text',
        });
        if (!channelName) {
          consola.error('The channel name must be at least one character long.');
          process.exit(1);
        }
      }
    }
    // Create the private key buffer
    let privateKeyBuffer: Buffer | undefined;
    if (privateKey) {
      if (privateKey.endsWith('.pem')) {
        const fileExists = await fileExistsAtPath(privateKey);
        if (fileExists) {
          privateKeyBuffer = await createBufferFromPath(privateKey);
        } else {
          consola.error('Private key file not found.');
          process.exit(1);
        }
      } else {
        consola.error('Private key must be a path to a .pem file.');
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
        channelName,
        checksum,
        gitCommitMessage: commitMessage,
        gitCommitRef: commitRef,
        gitCommitSha: commitSha,
        customProperties: parseCustomProperties(customProperty),
        expiresAt: expiresAt,
        url,
        maxAndroidAppVersionCode: androidMax,
        maxIosAppVersionCode: iosMax,
        minAndroidAppVersionCode: androidMin,
        minIosAppVersionCode: iosMin,
        rolloutPercentage,
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
          await appBundlesService.update({ appBundleFileId, appId, artifactStatus: 'ready', appBundleId: response.id });
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
      const message = getMessageFromUnknownError(error);
      consola.error(message);
      process.exit(1);
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
  try {
    // Generate checksum
    const hash = await createHash(options.buffer);
    // Sign the bundle
    let signature: string | undefined;
    if (options.privateKeyBuffer) {
      signature = await createSignature(options.privateKeyBuffer, options.buffer);
    }
    // Create the multipart upload
    return await appBundleFilesService.create({
      appId: options.appId,
      appBundleId: options.appBundleId,
      buffer: options.buffer,
      checksum: hash,
      href: options.href,
      mimeType: options.mimeType,
      name: options.name,
      signature,
    });
  } catch (error) {
    if (options.retryOnFailure) {
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
  // Generate the manifest file
  await generateManifestJson(options.path);
  // Get all files in the directory
  const files = await getFilesInDirectoryAndSubdirectories(options.path);
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
      appId: options.appId,
      appBundleId: options.appBundleId,
      buffer,
      href: file.href,
      mimeType: file.mimeType,
      name: file.name,
      privateKeyBuffer: options.privateKeyBuffer,
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
  // Read the zip file
  let fileBuffer;
  if (zip.isZipped(options.path)) {
    const readStream = createReadStream(options.path);
    fileBuffer = await createBufferFromReadStream(readStream);
  } else {
    consola.start('Zipping folder...');
    fileBuffer = await zip.zipFolder(options.path);
  }
  // Upload the zip file
  consola.start('Uploading file...');
  const result = await uploadFile({
    appId: options.appId,
    appBundleId: options.appBundleId,
    buffer: fileBuffer,
    mimeType: 'application/zip',
    name: 'bundle.zip',
    privateKeyBuffer: options.privateKeyBuffer,
  });
  return {
    appBundleFileId: result.id,
  };
};

const parseCustomProperties = (customProperty: string | string[] | undefined): Record<string, string> | undefined => {
  let customProperties: Record<string, string> | undefined;
  if (customProperty) {
    customProperties = {};
    if (Array.isArray(customProperty)) {
      for (const property of customProperty) {
        const [key, value] = property.split('=');
        if (key && value) {
          customProperties[key] = value;
        }
      }
    } else {
      const [key, value] = customProperty.split('=');
      if (key && value) {
        customProperties[key] = value;
      }
    }
  }
  return customProperties;
};
