import appDestinationsService from '@/services/app-destinations.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Retrieve a list of existing app destinations.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      json: z.boolean().optional().describe('Output in JSON format.'),
      limit: z.coerce.number().optional().describe('Limit for pagination.'),
      offset: z.coerce.number().optional().describe('Offset for pagination.'),
      platform: z.enum(['android', 'ios']).optional().describe('Filter by platform.'),
    }),
  ),
  action: withAuth(async (options, args) => {
    let { appId, json, limit, offset, platform } = options;

    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizationId = await promptOrganizationSelection();
      appId = await promptAppSelection(organizationId);
    }

    const destinations = await appDestinationsService.findAll({
      appId,
      limit,
      offset,
      platform,
    });
    if (json) {
      console.log(JSON.stringify(destinations, null, 2));
    } else {
      console.table(destinations);
      consola.success('Destinations retrieved successfully.');
    }
  }),
});
