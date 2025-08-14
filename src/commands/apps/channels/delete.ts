import { defineCommand } from 'citty';
import consola from 'consola';
import { isCI } from 'std-env';
import appChannelsService from '../../../services/app-channels.js';
import appsService from '../../../services/apps.js';
import organizationsService from '../../../services/organizations.js';
import { getMessageFromUnknownError } from '../../../utils/error.js';
import { prompt } from '../../../utils/prompt.js';

export default defineCommand({
  meta: {
    description: 'Delete an app channel.',
  },
  args: {
    appId: {
      type: 'string',
      description: 'ID of the app.',
    },
    channelId: {
      type: 'string',
      description: 'ID of the channel. Either the ID or name of the channel must be provided.',
    },
    name: {
      type: 'string',
      description: 'Name of the channel. Either the ID or name of the channel must be provided.',
    },
  },
  run: async (ctx) => {
    let appId = ctx.args.appId;
    let channelId = ctx.args.channelId;
    let channelName = ctx.args.name;
    if (!appId) {
      const organizations = await organizationsService.findAll();
      if (organizations.length === 0) {
        consola.error('You must create an organization before deleting a channel.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      const organizationId = await prompt(
        'Select the organization of the app from which you want to delete a channel.',
        {
          type: 'select',
          options: organizations.map((organization) => ({ label: organization.name, value: organization.id })),
        },
      );
      if (!organizationId) {
        consola.error('You must select the organization of an app from which you want to delete a channel.');
        process.exit(1);
      }
      const apps = await appsService.findAll({
        organizationId,
      });
      if (!apps.length) {
        consola.error('You must create an app before deleting a channel.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      appId = await prompt('Which app do you want to delete the channel from?', {
        type: 'select',
        options: apps.map((app) => ({ label: app.name, value: app.id })),
      });
    }
    if (!channelId && !channelName) {
      channelName = await prompt('Enter the channel name:', {
        type: 'text',
      });
    }
    if (!isCI) {
      const confirmed = await prompt('Are you sure you want to delete this channel?', {
        type: 'confirm',
      });
      if (!confirmed) {
        return;
      }
    }
    try {
      await appChannelsService.delete({
        appId,
        id: channelId,
        name: channelName,
      });
      consola.success('Channel deleted successfully.');
    } catch (error) {
      const message = getMessageFromUnknownError(error);
      consola.error(message);
      process.exit(1);
    }
  },
});
