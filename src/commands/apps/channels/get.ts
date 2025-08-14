import { defineCommand } from 'citty';
import consola from 'consola';
import appChannelsService from '../../../services/app-channels.js';
import authorizationService from '../../../services/authorization-service.js';
import { AppChannelDto } from '../../../types/index.js';
import { getMessageFromUnknownError } from '../../../utils/error.js';

export default defineCommand({
  meta: {
    description: 'Get an existing app channel.',
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
    json: {
      type: 'boolean',
      description: 'Output in JSON format.',
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

    let appId = ctx.args.appId as string | undefined;
    let channelId = ctx.args.channelId as string | undefined;
    let json = ctx.args.json as boolean | string | undefined;
    // Convert json to boolean
    if (typeof json === 'string') {
      json = json.toLowerCase() === 'true';
    }
    let name = ctx.args.name as string | undefined;
    if (!appId) {
      consola.error('You must provide an app ID.');
      process.exit(1);
    }
    if (!channelId && !name) {
      consola.error('You must provide a channel ID or name.');
      process.exit(1);
    }

    try {
      let channel: AppChannelDto | undefined;
      if (channelId) {
        channel = await appChannelsService.findOneById({
          appId,
          id: channelId,
        });
      } else if (name) {
        const foundChannels = await appChannelsService.findAll({
          appId,
          name,
        });
        channel = foundChannels[0];
      }
      if (!channel) {
        consola.error('Channel not found.');
        process.exit(1);
      }
      if (json) {
        console.log(
          JSON.stringify(
            {
              id: channel.id,
              name: channel.name,
              totalAppBundleLimit: channel.totalAppBundleLimit,
              appId: channel.appId,
            },
            null,
            2,
          ),
        );
      } else {
        console.table({
          id: channel.id,
          name: channel.name,
          totalAppBundleLimit: channel.totalAppBundleLimit,
          appId: channel.appId,
        });
        consola.success('Channel retrieved successfully.');
      }
    } catch (error) {
      const message = getMessageFromUnknownError(error);
      consola.error(message);
      process.exit(1);
    }
  },
});
