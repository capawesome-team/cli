import authorizationService from '@/services/authorization-service.js';
import organizationsService from '@/services/organizations.js';
import { prompt } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Create a new organization.',
  options: defineOptions(
    z.object({
      name: z.string().optional().describe('Name of the organization.'),
    }),
  ),
  action: async (options, args) => {
    let { name } = options;

    if (!authorizationService.hasAuthorizationToken()) {
      consola.error('You must be logged in to run this command.');
      process.exit(1);
    }
    if (!name) {
      name = await prompt('Enter the name of the organization:', { type: 'text' });
    }
    const response = await organizationsService.create({ name });
    consola.success('Organization created successfully.');
    consola.info(`Organization ID: ${response.id}`);
  },
});
