import { defineCommand } from 'citty';
import consola from 'consola';
import appChannelsService from '../../../services/app-channels.js';
import appsService from '../../../services/apps.js';
import authorizationService from '../../../services/authorization-service.js';
import organizationsService from '../../../services/organizations.js';
import { getMessageFromUnknownError } from '../../../utils/error.js';
import { prompt } from '../../../utils/prompt.js';

export default defineCommand({
  meta: {
    description: 'Update an existing app channel.',
  },
  args: {
    appId: {
      type: 'string',
      description: 'ID of the app.',
    },
    channelId: {
      type: 'string',
      description: 'ID of the channel.',
    },
    bundleLimit: {
      type: 'string',
      description:
        'Maximum number of bundles that can be assigned to the channel. If more bundles are assigned, the oldest bundles will be automatically deleted.',
    },
    name: {
      type: 'string',
      description: 'Name of the channel.',
    },
  },
  run: async (ctx) => {
    if (!authorizationService.hasAuthorizationToken()) {
      consola.error('You must be logged in to run this command.');
      process.exit(1);
    }

    let appId = ctx.args.appId;
    let bundleLimitAsString = ctx.args.bundleLimit as string | undefined;
    let channelId = ctx.args.channelId;
    let name = ctx.args.name as string | undefined;
    // Validate the bundle limit
    let bundleLimit: number | undefined;
    if (bundleLimitAsString) {
      bundleLimit = parseInt(bundleLimitAsString, 10);
      if (isNaN(bundleLimit)) {
        consola.error('The bundle limit must be a number.');
        process.exit(1);
      }
    }
    if (!appId) {
      const organizations = await organizationsService.findAll();
      if (organizations.length === 0) {
        consola.error('You must create an organization before updating a channel.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      const organizationId = await prompt(
        'Select the organization of the app for which you want to update a channel.',
        {
          type: 'select',
          options: organizations.map((organization) => ({ label: organization.name, value: organization.id })),
        },
      );
      if (!organizationId) {
        consola.error('You must select the organization of an app for which you want to update a channel.');
        process.exit(1);
      }
      const apps = await appsService.findAll({
        organizationId,
      });
      if (!apps.length) {
        consola.error('You must create an app before updating a channel.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      appId = await prompt('Which app do you want to update the channel for?', {
        type: 'select',
        options: apps.map((app) => ({ label: app.name, value: app.id })),
      });
    }
    if (!channelId) {
      channelId = await prompt('Enter the channel ID:', {
        type: 'text',
      });
    }

    // Update channel
    try {
      await appChannelsService.update({
        appId,
        appChannelId: channelId,
        name,
        totalAppBundleLimit: bundleLimit,
      });
      consola.success('Channel updated successfully.');
    } catch (error) {
      const message = getMessageFromUnknownError(error);
      consola.error(message);
      process.exit(1);
    }
  },
});
