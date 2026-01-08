import appEnvironmentsService from '@/services/app-environments.js';
import authorizationService from '@/services/authorization-service.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'List all environments for an app.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      json: z.boolean().optional().describe('Output in JSON format.'),
      limit: z.coerce.number().optional().describe('Limit for pagination.'),
      offset: z.coerce.number().optional().describe('Offset for pagination.'),
    }),
  ),
  action: async (options, args) => {
    const { appId, json, limit, offset } = options;

    if (!authorizationService.hasAuthorizationToken()) {
      consola.error('You must be logged in to run this command. Please run the `login` command first.');
      process.exit(1);
    }

    if (!appId) {
      consola.error('You must provide an app ID.');
      process.exit(1);
    }

    const environments = await appEnvironmentsService.findAll({
      appId,
      limit,
      offset,
    });

    if (json) {
      console.log(JSON.stringify(environments, null, 2));
    } else {
      console.table(environments);
      consola.success('Environments retrieved successfully.');
    }
  },
});
