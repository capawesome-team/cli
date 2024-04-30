import { defineCommand } from 'citty';
import consola from 'consola';
import { AxiosError } from 'axios';
import { isRunningInCi } from '../../../utils/ci';
import appsService from '../../../services/apps';
import { prompt } from '../../../utils/prompt';
import appChannelsService from '../../../services/app-channel';

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
      description: 'ID of the channel.',
    },
  },
  run: async (ctx) => {
    if (isRunningInCi()) {
      consola.error('This command is not supported in CI environments.');
      return;
    }
    let appId = ctx.args.appId;
    if (!appId) {
      const apps = await appsService.findAll();
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      appId = await prompt('Which app do you want to delete the channel from?', {
        type: 'select',
        options: apps.map((app) => ({ label: app.name, value: app.id })),
      });
    }
    let channel = ctx.args.channel;
    if (!channel) {
      channel = await prompt('Enter the channel name:', {
        type: 'text',
      });
    }
    if (typeof channel !== 'string') {
      consola.error('Channel name must be a string.');
      return;
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
        name: channel,
      });
      consola.success('Channel deleted successfully.');
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 401) {
        consola.error('Your token is no longer valid. Please sign in again.');
      } else {
        consola.error('Failed to delete channel.');
      }
    }
  },
});
