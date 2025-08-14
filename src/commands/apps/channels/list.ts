import consola from 'consola';
import { z } from 'zod';
import { defineCommand, defineOptions } from '../../../parser/config.js';
import appChannelsService from '../../../services/app-channels.js';
import authorizationService from '../../../services/authorization-service.js';
import { getMessageFromUnknownError } from '../../../utils/error.js';

export default defineCommand({
  description: 'Retrieve a list of existing app channels.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      json: z.boolean().optional().describe('Output in JSON format.'),
      limit: z.string().optional().describe('Limit for pagination.'),
      offset: z.string().optional().describe('Offset for pagination.'),
    }),
  ),
  action: async (options, args) => {
    let { appId, json, limit, offset } = options;

    if (!authorizationService.hasAuthorizationToken()) {
      consola.error('You must be logged in to run this command.');
      process.exit(1);
    }

    // Convert limit and offset to numbers
    const limitAsNumber = limit ? parseInt(limit, 10) : undefined;
    const offsetAsNumber = offset ? parseInt(offset, 10) : undefined;
    if (!appId) {
      consola.error('You must provide an app ID.');
      process.exit(1);
    }

    try {
      const foundChannels = await appChannelsService.findAll({
        appId: appId,
        limit: limitAsNumber,
        offset: offsetAsNumber,
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
    } catch (error) {
      const message = getMessageFromUnknownError(error);
      consola.error(message);
      process.exit(1);
    }
  },
});
