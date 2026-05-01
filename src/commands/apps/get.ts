import appsService from '@/services/apps.js';
import { withAuth } from '@/utils/auth.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Get an existing app.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      json: z.boolean().optional().describe('Output in JSON format.'),
    }),
  ),
  action: withAuth(async (options, args) => {
    const { appId, json } = options;

    if (!appId) {
      consola.error('You must provide an app ID.');
      process.exit(1);
    }

    const app = await appsService.findOne({ appId });
    if (json) {
      console.log(JSON.stringify(app, null, 2));
    } else {
      console.table(app);
      consola.success('App retrieved successfully.');
    }
  }),
});
