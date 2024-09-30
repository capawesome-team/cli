import { defineCommand } from 'citty';
import consola from 'consola';
import FormData from 'form-data';
import { createReadStream } from 'fs';
import apiAppBundleUploadService, { PartDto } from '../../../services/api/api-app-bundle-upload';
import appBundlesService from '../../../services/app-bundles';
import appsService from '../../../services/apps';
import authorizationService from '../../../services/authorization-service';
import { createBufferFromPath, createBufferFromReadStream } from '../../../utils/buffer';
import { getMessageFromUnknownError } from '../../../utils/error';
import { fileExistsAtPath, getFilesInDirectoryAndSubdirectories, isDirectory } from '../../../utils/file';
import { createHash } from '../../../utils/hash';
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
      return;
    }

    let androidMax = ctx.args.androidMax as string | undefined;
    let androidMin = ctx.args.androidMin as string | undefined;
    let appId = ctx.args.appId as string | undefined;
    let artifactType = ctx.args.artifactType as string | undefined;
    let channelName = ctx.args.channel as string | undefined;
    let iosMax = ctx.args.iosMax as string | undefined;
    let iosMin = ctx.args.iosMin as string | undefined;
    let path = ctx.args.path as string | undefined;
    let privateKey = ctx.args.privateKey as string | undefined;
    let rollout = ctx.args.rollout as string | undefined;
    let url = ctx.args.url as string | undefined;
    if (!path && !url) {
      path = await prompt('Enter the path to the app bundle:', {
        type: 'text',
      });
      if (!path) {
        consola.error('You must provide a path to the app bundle.');
        return;
      }
    }
    if (artifactType === 'manifest' && path) {
      const pathIsDirectory = isDirectory(path);
      if (!pathIsDirectory) {
        consola.error('The path must be a folder when creating a bundle with an artifact type of `manifest`.');
        return;
      }
    }
    if (!appId) {
      const apps = await appsService.findAll();
      if (apps.length === 0) {
        consola.error('You must create an app before creating a bundle.');
        return;
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      appId = await prompt('Which app do you want to deploy to:', {
        type: 'select',
        options: apps.map((app) => ({ label: app.name, value: app.id })),
      });
      if (!appId) {
        consola.error('You must select an app to deploy to.');
        return;
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
          return;
        }
      } else {
        consola.error('Private key must be a path to a .pem file.');
        return;
      }
    }

    // Create form data
    const formData = new FormData();
    formData.append('artifactType', artifactType || 'zip');
    if (url) {
      formData.append('url', url);
    }
    if (channelName) {
      formData.append('channelName', channelName);
    }
    if (androidMax) {
      formData.append('maxAndroidAppVersionCode', androidMax);
    }
    if (androidMin) {
      formData.append('minAndroidAppVersionCode', androidMin);
    }
    if (rollout) {
      const rolloutAsNumber = parseFloat(rollout);
      if (isNaN(rolloutAsNumber) || rolloutAsNumber < 0 || rolloutAsNumber > 1) {
        consola.error('Rollout percentage must be a number between 0 and 1 (e.g. 0.5).');
        return;
      }
      formData.append('rolloutPercentage', rolloutAsNumber);
    }
    if (iosMax) {
      formData.append('maxIosAppVersionCode', iosMax);
    }
    if (iosMin) {
      formData.append('minIosAppVersionCode', iosMin);
    }
    try {
      // Create the app bundle
      consola.start('Creating bundle...');
      const response = await appBundlesService.create({ appId: appId, formData });
      if (path) {
        // Upload the app bundle files
        if (artifactType === 'manifest') {
          await uploadManifest({ appId: appId, appBundleId: response.id, path, privateKeyBuffer });
        } else {
          await uploadZip({ appId: appId, appBundleId: response.id, path, privateKeyBuffer });
        }
        // Update the app bundle
        consola.start('Updating bundle...');
        await appBundlesService.update({ appId: appId, artifactStatus: 'uploaded', appBundleId: response.id });
      }
      consola.success('Bundle successfully created.');
      consola.info(`Bundle ID: ${response.id}`);
    } catch (error) {
      const message = getMessageFromUnknownError(error);
      consola.error(message);
    }
  },
});

const uploadManifest = async (options: {
  appId: string;
  appBundleId: string;
  path: string;
  privateKeyBuffer: Buffer | undefined;
}) => {
  // Get all files in the directory
  const files = await getFilesInDirectoryAndSubdirectories(options.path);
  // Upload each file
  for (const file of files) {
    const relativePath = file.replace(options.path + '/', '');
    const buffer = await createBufferFromPath(file);
    await uploadFile({
      appId: options.appId,
      appBundleId: options.appBundleId,
      buffer: buffer,
      href: relativePath,
      privateKeyBuffer: options.privateKeyBuffer,
    });
  }
};

const uploadZip = async (options: {
  appId: string;
  appBundleId: string;
  path: string;
  privateKeyBuffer: Buffer | undefined;
}) => {
  // Read the zip file
  let buffer;
  if (zip.isZipped(options.path)) {
    const readStream = createReadStream(options.path);
    buffer = await createBufferFromReadStream(readStream);
  } else {
    consola.start('Zipping folder...');
    buffer = await zip.zipFolder(options.path);
  }
  // Upload the zip file
  await uploadFile({
    appId: options.appId,
    appBundleId: options.appBundleId,
    buffer: buffer,
    privateKeyBuffer: options.privateKeyBuffer,
  });
};

const uploadFile = async (options: {
  appId: string;
  appBundleId: string;
  buffer: Buffer;
  href?: string;
  privateKeyBuffer: Buffer | undefined;
}) => {
  // Generate checksum
  consola.start('Generating checksum...');
  const hash = await createHash(options.buffer);
  // Sign the bundle
  let signature: string | undefined;
  if (options.privateKeyBuffer) {
    consola.start('Signing bundle...');
    signature = await createSignature(options.privateKeyBuffer, options.buffer);
  }
  // Create the multipart upload
  consola.start('Upload bundle...');
  const { key, uploadId } = await apiAppBundleUploadService.createMultipartUpload({
    appId: options.appId,
    appBundleId: options.appBundleId,
  });
  // Upload the parts
  const chunkSize = 1024 * 1024 * 10; // 10 Megabytes
  const totalSize = options.buffer.length;
  const chunks: { buffer: Buffer; end: number; start: number }[] = [];
  for (let start = 0; start < totalSize; start += chunkSize) {
    const end = Math.min(start + chunkSize, totalSize);
    const chunk = options.buffer.slice(start, end);
    chunks.push({ start, end, buffer: chunk });
  }
  const parts: PartDto[] = [];
  for (const chunk of chunks) {
    const formData = new FormData();
    formData.append('action', 'mpu-uploadpart');
    formData.append('blob', chunk.buffer, { filename: 'bundle.zip' });
    formData.append('key', key);
    formData.append('partNumber', (parts.length + 1).toString());
    formData.append('uploadId', uploadId);
    const part = await apiAppBundleUploadService.uploadPart({
      appId: options.appId,
      appBundleId: options.appBundleId,
      formData,
    });
    parts.push(part);
  }
  // Complete the multipart upload
  await apiAppBundleUploadService.completeMultipartUpload({
    appId: options.appId,
    appBundleId: options.appBundleId,
    checksum: hash,
    href: options.href,
    key,
    parts,
    signature,
    uploadId,
  });
};
