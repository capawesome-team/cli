import { defineCommand } from 'citty';
import consola from 'consola';
import appBundlesService from '../../../services/app-bundles';
import appsService from '../../../services/apps';
import organizationsService from '../../../services/organizations';
import { getMessageFromUnknownError } from '../../../utils/error';
import { prompt } from '../../../utils/prompt';

export default defineCommand({
  meta: {
    description: 'Delete an app bundle.',
  },
  args: {
    appId: {
      type: 'string',
      description: 'ID of the app.',
    },
    bundleId: {
      type: 'string',
      description: 'ID of the bundle.',
    },
  },
  run: async (ctx) => {
    // Prompt for missing arguments
    let appId = ctx.args.appId;
    let bundleId = ctx.args.bundleId;
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
