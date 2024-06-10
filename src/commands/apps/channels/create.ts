import { defineCommand } from 'citty';
import consola from 'consola';
import { prompt } from '../../../utils/prompt';
import appsService from '../../../services/apps';
import appChannelsService from '../../../services/app-channels';
import { getMessageFromUnknownError } from '../../../utils/error';

export default defineCommand({
  meta: {
    description: 'Create a new app channel.',
  },
  args: {
    appId: {
      type: 'string',
      description: 'ID of the app.',
    },
    name: {
      type: 'string',
      description: 'Name of the channel.',
    },
  },
  run: async (ctx) => {
    let appId = ctx.args.appId;
    if (!appId) {
      const apps = await appsService.findAll();
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      appId = await prompt('Which app do you want to delete the channel from?', {
        type: 'select',
        options: apps.map((app) => ({ label: app.name, value: app.id })),
      });
    }
    let name = ctx.args.name;
    if (!name) {
      name = await prompt('Enter the name of the channel:', { type: 'text' });
    }
    try {
      const response = await appChannelsService.create({
        appId,
        name,
      });
      consola.success('Channel created successfully.');
      consola.info(`Channel ID: ${response.id}`);
    } catch (error) {
      const message = getMessageFromUnknownError(error);
      consola.error(message);
    }
  },
});
