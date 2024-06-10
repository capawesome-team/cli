import { defineCommand } from 'citty';
import consola from 'consola';
import appsService from '../../../services/apps';
import { prompt } from '../../../utils/prompt';
import appBundlesService from '../../../services/app-bundles';
import { getMessageFromUnknownError } from '../../../utils/error';

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
      const apps = await appsService.findAll();
      if (!apps.length) {
        consola.error('You must create an app before deleting a bundle.');
        return;
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
        bundleId,
      });
      consola.success('Bundle deleted successfully.');
    } catch (error) {
      const message = getMessageFromUnknownError(error);
      consola.error(message);
    }
  },
});
