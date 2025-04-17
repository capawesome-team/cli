import { defineCommand } from 'citty';
import consola from 'consola';
import appChannelsService from '../../../services/app-channels';
import appsService from '../../../services/apps';
import { getMessageFromUnknownError } from '../../../utils/error';
import { prompt } from '../../../utils/prompt';

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
      description:
        'ID of the channel. Either channelId or name must be provided. If both are provided, channelId will be used.',
    },
    name: {
      type: 'string',
      description:
        'Name of the channel. Either channelId or name must be provided. If both are provided, channelId will be used.',
    },
  },
  run: async (ctx) => {
    let appId = ctx.args.appId;
    let channelId = ctx.args.channelId;
    let channelName = ctx.args.name;
    if (!appId) {
      const apps = await appsService.findAll();
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
    const confirmed = await prompt('Are you sure you want to delete this channel?', {
      type: 'confirm',
    });
    if (!confirmed) {
      return;
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
