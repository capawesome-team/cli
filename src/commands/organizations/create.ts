import organizationsService from '@/services/organizations.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { prompt } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Create a new organization.',
  options: defineOptions(
    z.object({
      json: z.boolean().optional().describe('Output in JSON format.'),
      name: z.string().optional().describe('Name of the organization.'),
    }),
  ),
  action: withAuth(async (options, args) => {
    let { json, name } = options;

    if (!name) {
      if (!isInteractive()) {
        consola.error('You must provide the organization name when running in non-interactive environment.');
        process.exit(1);
      }
      name = await prompt('Enter the name of the organization:', { type: 'text' });
    }
    const response = await organizationsService.create({ name });
    if (json) {
      console.log(JSON.stringify({ id: response.id }, null, 2));
    } else {
      consola.info(`Organization ID: ${response.id}`);
      consola.success('Organization created successfully.');
    }
  }),
});
