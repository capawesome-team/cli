import { defineCommand } from 'citty';
import consola from 'consola';
import { createReadStream } from 'fs';
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
    customProperty: {
      type: 'string',
      description: 'Custom properties to associate with the bundle.',
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

    let androidMax = ctx.args.androidMax as string | undefined;
    let androidMin = ctx.args.androidMin as string | undefined;
    let appId = ctx.args.appId as string | undefined;
    let artifactType =
      ctx.args.artifactType === 'manifest' || ctx.args.artifactType === 'zip'
        ? ctx.args.artifactType
        : ('zip' as 'manifest' | 'zip');
    let channelName = ctx.args.channel as string | undefined;
    let customProperty = ctx.args.customProperty as string | string[] | undefined;
    let expiresInDays = ctx.args.expiresInDays as string | undefined;
    let iosMax = ctx.args.iosMax as string | undefined;
    let iosMin = ctx.args.iosMin as string | undefined;
    let path = ctx.args.path as string | undefined;
    let privateKey = ctx.args.privateKey as string | undefined;
    let rolloutAsString = ctx.args.rollout as string | undefined;
    let url = ctx.args.url as string | undefined;
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
    if (!path && !url) {
      path = await prompt('Enter the path to the app bundle:', {
        type: 'text',
      });
      if (!path) {
        consola.error('You must provide a path to the app bundle.');
        process.exit(1);
      }
    }
    if (artifactType === 'manifest' && path) {
      const pathIsDirectory = isDirectory(path);
      if (!pathIsDirectory) {
        consola.error('The path must be a folder when creating a bundle with an artifact type of `manifest`.');
        process.exit(1);
      }
    }
    // Check if the path exists
    const pathExists = await fileExistsAtPath(path!);
    if (!pathExists) {
      consola.error(`The path does not exist.`);
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
    }
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
      const response = await appBundlesService.create({
        appId,
        artifactType,
        channelName,
        customProperties: parseCustomProperties(customProperty),
        expiresAt: expiresAt,
        url,
        maxAndroidAppVersionCode: androidMax,
        maxIosAppVersionCode: iosMax,
        minAndroidAppVersionCode: androidMin,
        minIosAppVersionCode: iosMin,
        rolloutPercentage,
      });
      appBundleId = response.id;
      if (path) {
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
  fileBuffer: Buffer;
  fileName: string;
  href?: string;
  privateKeyBuffer: Buffer | undefined;
}): Promise<AppBundleFileDto> => {
  // Generate checksum
  const hash = await createHash(options.fileBuffer);
  // Sign the bundle
  let signature: string | undefined;
  if (options.privateKeyBuffer) {
    signature = await createSignature(options.privateKeyBuffer, options.fileBuffer);
  }
  // Create the multipart upload
  return appBundleFilesService.create({
    appId: options.appId,
    appBundleId: options.appBundleId,
    checksum: hash,
    fileBuffer: options.fileBuffer,
    fileName: options.fileName,
    href: options.href,
    signature,
  });
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
  const MAX_CONCURRENT_UPLOADS = 20;
  let fileIndex = 0;

  const uploadNextFile = async () => {
    if (fileIndex >= files.length) {
      return;
    }

    const file = files[fileIndex] as { path: string; name: string };
    fileIndex++;

    consola.start(`Uploading file (${fileIndex}/${files.length})...`);
    const fileBuffer = await createBufferFromPath(file.path);
    const fileName = file.name;
    const href = file.path.replace(options.path + '/', '');

    await uploadFile({
      appId: options.appId,
      appBundleId: options.appBundleId,
      fileBuffer,
      fileName,
      href,
      privateKeyBuffer: options.privateKeyBuffer,
    });
    await uploadNextFile();
  };

  const uploadPromises = Array(MAX_CONCURRENT_UPLOADS);
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
    fileBuffer,
    fileName: 'bundle.zip',
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
