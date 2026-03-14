import appDestinationsService from '@/services/app-destinations.js';
import { withAuth } from '@/utils/auth.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Get an existing app destination.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      destinationId: z.string().optional().describe('ID of the destination.'),
      json: z.boolean().optional().describe('Output in JSON format.'),
    }),
  ),
  action: withAuth(async (options, args) => {
    const { appId, destinationId, json } = options;

    if (!appId) {
      consola.error('You must provide an app ID.');
      process.exit(1);
    }
    if (!destinationId) {
      consola.error('You must provide a destination ID.');
      process.exit(1);
    }

    const destination = await appDestinationsService.findOneById({
      appId,
      destinationId,
    });
    if (json) {
      console.log(JSON.stringify(destination, null, 2));
    } else {
      console.table(destination);
      consola.success('Destination retrieved successfully.');
    }
  }),
});
