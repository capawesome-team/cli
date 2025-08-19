import appChannelsService from '@/services/app-channels.js';
import authorizationService from '@/services/authorization-service.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Retrieve a list of existing app channels.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      json: z.boolean().optional().describe('Output in JSON format.'),
      limit: z.coerce.number().optional().describe('Limit for pagination.'),
      offset: z.coerce.number().optional().describe('Offset for pagination.'),
    }),
  ),
  action: async (options, args) => {
    let { appId, json, limit, offset } = options;

    if (!authorizationService.hasAuthorizationToken()) {
      consola.error('You must be logged in to run this command.');
      process.exit(1);
    }

    if (!appId) {
      consola.error('You must provide an app ID.');
      process.exit(1);
    }

    const foundChannels = await appChannelsService.findAll({
      appId,
      limit,
      offset,
    });
    const logData = foundChannels.map((channel) => ({
      id: channel.id,
      name: channel.name,
      totalAppBundleLimit: channel.totalAppBundleLimit,
      appId: channel.appId,
      createdAt: channel.createdAt,
      updatedAt: channel.updatedAt,
    }));
    if (json) {
      console.log(JSON.stringify(logData, null, 2));
    } else {
      console.table(logData);
      consola.success('Channels retrieved successfully.');
    }
  },
});
