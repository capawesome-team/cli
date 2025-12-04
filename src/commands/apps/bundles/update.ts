import appBundlesService from '@/services/app-bundles.js';
import appsService from '@/services/apps.js';
import authorizationService from '@/services/authorization-service.js';
import organizationsService from '@/services/organizations.js';
import { prompt } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { hasTTY } from 'std-env';
import { z } from 'zod';

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
      androidEq: z
        .string()
        .optional()
        .describe('The exact Android version code (`versionCode`) that the bundle should not support.'),
      appId: z.string().optional().describe('ID of the app.'),
      bundleId: z.string().optional().describe('ID of the bundle.'),
      rollout: z.coerce
        .number()
        .min(0)
        .max(1, {
          message: 'Rollout percentage must be a number between 0 and 1 (e.g. 0.5).',
        })
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
      iosEq: z
        .string()
        .optional()
        .describe('The exact iOS bundle version (`CFBundleVersion`) that the bundle should not support.'),
    }),
  ),
  action: async (options, args) => {
    let { androidMax, androidMin, androidEq, appId, bundleId, rollout, iosMax, iosMin, iosEq } = options;

    if (!authorizationService.hasAuthorizationToken()) {
      consola.error('You must be logged in to run this command. Please run the `login` command first.');
      process.exit(1);
    }

    // Prompt for missing arguments
    if (!appId) {
      if (!hasTTY) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
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
      if (!hasTTY) {
        consola.error('You must provide the bundle ID when running in non-interactive environment.');
        process.exit(1);
      }
      bundleId = await prompt('Enter the bundle ID:', {
        type: 'text',
      });
    }

    // Update bundle
    await appBundlesService.update({
      appId,
      appBundleId: bundleId,
      maxAndroidAppVersionCode: androidMax,
      maxIosAppVersionCode: iosMax,
      minAndroidAppVersionCode: androidMin,
      minIosAppVersionCode: iosMin,
      eqAndroidAppVersionCode: androidEq,
      eqIosAppVersionCode: iosEq,
      rolloutPercentage: rollout,
    });
    consola.success('Bundle updated successfully.');
  },
});
