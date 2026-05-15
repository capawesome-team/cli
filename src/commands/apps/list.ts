import appsService from '@/services/apps.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { promptOrganizationSelection } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Retrieve a list of existing apps.',
  options: defineOptions(
    z.object({
      json: z.boolean().optional().describe('Output in JSON format.'),
      limit: z.coerce.number().optional().describe('Limit for pagination.'),
      offset: z.coerce.number().optional().describe('Offset for pagination.'),
      organizationId: z.string().optional().describe('ID of the organization.'),
    }),
  ),
  action: withAuth(async (options, args) => {
    let { json, limit, offset, organizationId } = options;

    if (!organizationId) {
      if (!isInteractive()) {
        consola.error('You must provide an organization ID when running in non-interactive environment.');
        process.exit(1);
      }
      organizationId = await promptOrganizationSelection();
    }

    const foundApps = await appsService.findAll({
      organizationId,
      limit,
      offset,
    });
    if (json) {
      console.log(JSON.stringify(foundApps, null, 2));
    } else {
      console.table(foundApps);
      consola.success('Apps retrieved successfully.');
    }
  }),
});
