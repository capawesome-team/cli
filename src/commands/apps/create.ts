import appsService from '@/services/apps.js';
import organizationsService from '@/services/organizations.js';
import { prompt } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Create a new app.',
  options: defineOptions(
    z.object({
      name: z.string().optional().describe('Name of the app.'),
      organizationId: z.string().optional().describe('ID of the organization to create the app in.'),
    }),
  ),
  action: async (options, args) => {
    let { name, organizationId } = options;
    if (!organizationId) {
      const organizations = await organizationsService.findAll();
      if (organizations.length === 0) {
        consola.error('You must create an organization before creating an app.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      organizationId = await prompt('Which organization do you want to create the app in?', {
        type: 'select',
        options: organizations.map((organization) => ({ label: organization.name, value: organization.id })),
      });
      if (!organizationId) {
        consola.error('You must select an organization to create the app in.');
        process.exit(1);
      }
    }
    if (!name) {
      name = await prompt('Enter the name of the app:', { type: 'text' });
    }
    const response = await appsService.create({ name, organizationId });
    consola.success('App created successfully.');
    consola.info(`App ID: ${response.id}`);
  },
});
