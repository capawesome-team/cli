import appEnvironmentsService from '@/services/app-environments.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
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
  action: withAuth(async (options, args) => {
    let { appId, json, limit, offset } = options;

    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizationId = await promptOrganizationSelection();
      appId = await promptAppSelection(organizationId);
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
  }),
});
