import organizationsService from '@/services/organizations.js';
import { withAuth } from '@/utils/auth.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Retrieve a list of existing organizations.',
  options: defineOptions(
    z.object({
      json: z.boolean().optional().describe('Output in JSON format.'),
      limit: z.coerce.number().optional().describe('Limit for pagination.'),
      offset: z.coerce.number().optional().describe('Offset for pagination.'),
    }),
  ),
  action: withAuth(async (options, args) => {
    const { json, limit, offset } = options;

    const foundOrganizations = await organizationsService.findAll({
      limit,
      offset,
    });
    if (json) {
      console.log(JSON.stringify(foundOrganizations, null, 2));
    } else {
      console.table(foundOrganizations);
      consola.success('Organizations retrieved successfully.');
    }
  }),
});
