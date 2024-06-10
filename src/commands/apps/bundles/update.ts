import { defineCommand } from 'citty';
import consola from 'consola';
import { prompt } from '../../../utils/prompt';
import authorizationService from '../../../services/authorization-service';
import appsService from '../../../services/apps';
import appBundlesService from '../../../services/app-bundles';
import { getMessageFromUnknownError } from '../../../utils/error';

export default defineCommand({
  meta: {
    description: 'Update an app bundle.',
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
      description: 'ID of the app.',
    },
    bundleId: {
      type: 'string',
      description: 'ID of the bundle.',
    },
    rollout: {
      type: 'string',
      description: 'The percentage of devices to deploy the bundle to. Must be a number between 0 and 1 (e.g. 0.5).',
    },
    iosMax: {
      type: 'string',
      description: 'The maximum iOS bundle version (`CFBundleVersion`) that the bundle supports.',
    },
    iosMin: {
      type: 'string',
      description: 'The minimum iOS bundle version (`CFBundleVersion`) that the bundle supports.',
    },
  },
  run: async (ctx) => {
    if (!authorizationService.hasAuthorizationToken()) {
      consola.error('You must be logged in to run this command.');
      return;
    }

    // Prompt for missing arguments
    const { androidMax, androidMin, rollout, iosMax, iosMin } = ctx.args;
    let appId = ctx.args.appId;
    let bundleId = ctx.args.bundleId;
    if (!appId) {
      const apps = await appsService.findAll();
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      appId = await prompt('Which app do you want to update the bundle for?', {
        type: 'select',
        options: apps.map((app) => ({ label: app.name, value: app.id })),
      });
    }
    if (!bundleId) {
      bundleId = await prompt('Enter the bundle ID:', {
        type: 'text',
      });
    }

    // Update bundle
    try {
      const rolloutAsNumber = parseFloat(rollout);
      await appBundlesService.update({
        appId,
        bundleId,
        maxAndroidAppVersionCode: androidMax,
        maxIosAppVersionCode: iosMax,
        minAndroidAppVersionCode: androidMin,
        minIosAppVersionCode: iosMin,
        rolloutPercentage: rolloutAsNumber,
      });
      consola.success('Bundle updated successfully.');
    } catch (error) {
      const message = getMessageFromUnknownError(error);
      consola.error(message);
    }
  },
});
