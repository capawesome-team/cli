import { defineCommand } from 'citty';
import consola from 'consola';
import appChannelsService from '../../../services/app-channels';
import authorizationService from '../../../services/authorization-service';
import { getMessageFromUnknownError } from '../../../utils/error';

export default defineCommand({
  meta: {
    description: 'Retrieve a list of existing app channels.',
  },
  args: {
    appId: {
      type: 'string',
      description: 'ID of the app.',
    },
    json: {
      type: 'boolean',
      description: 'Output in JSON format.',
    },
    limit: {
      type: 'string',
      description: 'Limit for pagination.',
    },
    offset: {
      type: 'string',
      description: 'Offset for pagination.',
    },
  },
  run: async (ctx) => {
    if (!authorizationService.hasAuthorizationToken()) {
      consola.error('You must be logged in to run this command.');
      process.exit(1);
    }

    let appId = ctx.args.appId as string | undefined;
    let json = ctx.args.json as boolean | string | undefined;
    const limit = ctx.args.limit as string | undefined;
    const offset = ctx.args.offset as string | undefined;
    // Convert limit and offset to numbers
    const limitAsNumber = limit ? parseInt(limit, 10) : undefined;
    const offsetAsNumber = offset ? parseInt(offset, 10) : undefined;
    // Convert json to boolean
    if (typeof json === 'string') {
      json = json.toLowerCase() === 'true';
    }
    if (!appId) {
      consola.error('You must provide an app ID.');
      process.exit(1);
    }

    try {
      const foundChannels = await appChannelsService.findAll({
        appId,
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
