import consola from 'consola';
import { z } from 'zod';
import { defineCommand, defineOptions } from 'zodest/config';
import appChannelsService from '../../../services/app-channels.js';
import authorizationService from '../../../services/authorization-service.js';
import { AppChannelDto } from '../../../types/index.js';
import { getMessageFromUnknownError } from '../../../utils/error.js';

export default defineCommand({
  description: 'Get an existing app channel.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      channelId: z.string().optional().describe('ID of the channel.'),
      json: z.boolean().optional().describe('Output in JSON format.'),
      name: z.string().optional().describe('Name of the channel.'),
    }),
  ),
  action: async (options, args) => {
    let { appId, channelId, json, name } = options;

    if (!authorizationService.hasAuthorizationToken()) {
      consola.error('You must be logged in to run this command.');
      process.exit(1);
    }

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
