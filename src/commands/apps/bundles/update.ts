import consola from 'consola';
import { z } from 'zod';
import { defineCommand, defineOptions } from 'zodest/config';
import appBundlesService from '../../../services/app-bundles.js';
import appsService from '../../../services/apps.js';
import authorizationService from '../../../services/authorization-service.js';
import organizationsService from '../../../services/organizations.js';
import { getMessageFromUnknownError } from '../../../utils/error.js';
import { prompt } from '../../../utils/prompt.js';

export default defineCommand({
  description: 'Update an app bundle.',
  options: defineOptions(
    z.object({
      androidMax: z
        .string()
        .optional()
        .describe('The maximum Android version code (`versionCode`) that the bundle supports.'),
      androidMin: z
        .string()
        .optional()
        .describe('The minimum Android version code (`versionCode`) that the bundle supports.'),
      appId: z.string().optional().describe('ID of the app.'),
      bundleId: z.string().optional().describe('ID of the bundle.'),
      rollout: z
        .string()
        .optional()
        .describe('The percentage of devices to deploy the bundle to. Must be a number between 0 and 1 (e.g. 0.5).'),
      iosMax: z
        .string()
        .optional()
        .describe('The maximum iOS bundle version (`CFBundleVersion`) that the bundle supports.'),
      iosMin: z
        .string()
        .optional()
        .describe('The minimum iOS bundle version (`CFBundleVersion`) that the bundle supports.'),
    }),
  ),
  action: async (options, args) => {
    let { androidMax, androidMin, appId, bundleId, rollout, iosMax, iosMin } = options;

    if (!authorizationService.hasAuthorizationToken()) {
      consola.error('You must be logged in to run this command.');
      process.exit(1);
    }

    // Prompt for missing arguments
    if (!appId) {
      const organizations = await organizationsService.findAll();
      if (organizations.length === 0) {
        consola.error('You must create an organization before updating a bundle.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      const organizationId = await prompt('Select the organization of the app for which you want to update a bundle.', {
        type: 'select',
        options: organizations.map((organization) => ({ label: organization.name, value: organization.id })),
      });
      if (!organizationId) {
        consola.error('You must select the organization of an app for which you want to update a bundle.');
        process.exit(1);
      }
      const apps = await appsService.findAll({
        organizationId,
      });
      if (!apps.length) {
        consola.error('You must create an app before updating a bundle.');
        process.exit(1);
      }
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
      const rolloutAsNumber = rollout ? parseFloat(rollout) : undefined;
      await appBundlesService.update({
        appId,
        appBundleId: bundleId,
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
      process.exit(1);
    }
  },
});
