import organizationsService from '@/services/organizations.js';
import { withAuth } from '@/utils/auth.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Get an existing organization.',
  options: defineOptions(
    z.object({
      json: z.boolean().optional().describe('Output in JSON format.'),
      organizationId: z.string().optional().describe('ID of the organization.'),
    }),
  ),
  action: withAuth(async (options, args) => {
    const { json, organizationId } = options;

    if (!organizationId) {
      consola.error('You must provide an organization ID.');
      process.exit(1);
    }

    const organization = await organizationsService.findOne({ organizationId });
    if (json) {
      console.log(JSON.stringify(organization, null, 2));
    } else {
      console.table(organization);
      consola.success('Organization retrieved successfully.');
    }
  }),
});
