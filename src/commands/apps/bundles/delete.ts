import { defineCommand } from 'citty';
import consola from 'consola';
import appBundlesService from '../../../services/app-bundles';
import appsService from '../../../services/apps';
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
    bundleName: {
      type: 'string',
      description: 'Name of the bundle. If both bundleId and bundleName are provided, bundleId will be used and bundleName will be ignored.',
    }
  },
  run: async (ctx) => {
    // Prompt for missing arguments
    let appId = ctx.args.appId;
    let bundleId = ctx.args.bundleId;
    let bundleName = ctx.args.bundleName;
    if (!appId) {
      const apps = await appsService.findAll();
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
    if (!bundleId && !bundleName) {
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
        appBundleName: bundleName,
      });
      consola.success('Bundle deleted successfully.');
    } catch (error) {
      const message = getMessageFromUnknownError(error);
      consola.error(message);
      process.exit(1);
    }
  },
});
