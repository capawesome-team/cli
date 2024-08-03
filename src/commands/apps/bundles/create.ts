import { defineCommand } from 'citty';
import consola from 'consola';
import { prompt } from '../../../utils/prompt';
import zip from '../../../utils/zip';
import FormData from 'form-data';
import { createReadStream } from 'node:fs';
import authorizationService from '../../../services/authorization-service';
import appsService from '../../../services/apps';
import appBundlesService from '../../../services/app-bundles';
import { getMessageFromUnknownError } from '../../../utils/error';
import { createHash } from '../../../utils/hash';
import { createBuffer, createBufferFromPath } from '../../../utils/buffer';
import { createSignature } from '../../../utils/signature';
import { fileExistsAtPath } from '../../../utils/file';

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

    const { androidMax, androidMin, privateKey, rollout, iosMax, iosMin } = ctx.args;
    let appId = ctx.args.appId;
    let channelName = ctx.args.channel;
    let path = ctx.args.path;
    let url = ctx.args.url;
    if (!path && !url) {
      path = await prompt('Enter the path to the app bundle:', {
        type: 'text',
      });
      if (!path) {
        consola.error('You must provide a path to the app bundle.');
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
    let privateKeyBuffer;
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
    if (path) {
      let fileBuffer;
      if (zip.isZipped(path)) {
        const readStream = createReadStream(path);
        fileBuffer = await createBuffer(readStream);
      } else {
        consola.start('Zipping folder...');
        fileBuffer = await zip.zipFolder(path);
      }
      consola.start('Generating checksum...');
      const hash = await createHash(fileBuffer);
      formData.append('file', fileBuffer, { filename: 'bundle.zip' });
      formData.append('checksum', hash);
      if (privateKeyBuffer) {
        consola.start('Signing bundle...');
        const signature = await createSignature(privateKeyBuffer, fileBuffer);
        formData.append('signature', signature);
      }
    }
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
    if (path) {
      consola.start('Uploading...');
    } else {
      consola.start('Creating...');
    }
    // Upload the bundle
    try {
      const response = await appBundlesService.create({ appId: appId, formData: formData });
      consola.success('Bundle successfully created.');
      consola.info(`Bundle ID: ${response.id}`);
    } catch (error) {
      const message = getMessageFromUnknownError(error);
      consola.error(message);
    }
  },
});
