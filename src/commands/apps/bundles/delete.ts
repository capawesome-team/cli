import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';
import appBundlesService from '@/services/app-bundles.js';
import appsService from '@/services/apps.js';
import organizationsService from '@/services/organizations.js';
import { getMessageFromUnknownError } from '@/utils/error.js';
import { prompt } from '@/utils/prompt.js';

export default defineCommand({
  description: 'Delete an app bundle.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      bundleId: z.string().optional().describe('ID of the bundle.'),
    }),
  ),
  action: async (options, args) => {
    let { appId, bundleId } = options;

    // Prompt for missing arguments
    if (!appId) {
      const organizations = await organizationsService.findAll();
      if (organizations.length === 0) {
        consola.error('You must create an organization before deleting a bundle.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      const organizationId = await prompt(
        'Select the organization of the app from which you want to delete a bundle.',
        {
          type: 'select',
          options: organizations.map((organization) => ({ label: organization.name, value: organization.id })),
        },
      );
      if (!organizationId) {
        consola.error('You must select the organization of an app from which you want to delete a bundle.');
        process.exit(1);
      }
      const apps = await appsService.findAll({
        organizationId,
      });
      if (!apps.length) {
        consola.error('You must create an app before deleting a bundle.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      appId = await prompt('Which app do you want to delete the bundle from?', {
        type: 'select',
        options: apps.map((app) => ({ label: app.name, value: app.id })),
      });
    }
    if (!bundleId) {
      bundleId = await prompt('Enter the bundle ID:', {
        type: 'text',
      });
    }

    // Confirm deletion
    const confirmed = await prompt('Are you sure you want to delete this bundle?', {
      type: 'confirm',
    });
    if (!confirmed) {
      return;
    }

    // Delete bundle
    try {
      await appBundlesService.delete({
        appId,
        appBundleId: bundleId,
      });
      consola.success('Bundle deleted successfully.');
    } catch (error) {
      const message = getMessageFromUnknownError(error);
      consola.error(message);
      process.exit(1);
    }
  },
});
