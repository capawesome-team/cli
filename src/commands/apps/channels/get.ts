import appChannelsService from '@/services/app-channels.js';
import { AppChannelDto } from '@/types/index.js';
import { withAuth } from '@/utils/auth.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

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
  action: withAuth(async (options, args) => {
    let { appId, channelId, json, name } = options;

    if (!appId) {
      consola.error('You must provide an app ID.');
      process.exit(1);
    }
    if (!channelId && !name) {
      consola.error('You must provide a channel ID or name.');
      process.exit(1);
    }

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
      console.log(JSON.stringify(channel, null, 2));
    } else {
      console.table(channel);
      consola.success('Channel retrieved successfully.');
    }
  }),
});
