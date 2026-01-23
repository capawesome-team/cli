import appsService from '@/services/apps.js';
import authorizationService from '@/services/authorization-service.js';
import organizationsService from '@/services/organizations.js';
import { isInteractive } from '@/utils/environment.js';
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

    if (!authorizationService.hasAuthorizationToken()) {
      consola.error('You must be logged in to run this command. Please run the `login` command first.');
      process.exit(1);
    }
    if (!organizationId) {
      if (!isInteractive()) {
        consola.error('You must provide the organization ID when running in non-interactive environment.');
        process.exit(1);
      }
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
      if (!isInteractive()) {
        consola.error('You must provide the app name when running in non-interactive environment.');
        process.exit(1);
      }
      name = await prompt('Enter the name of the app:', { type: 'text' });
    }
    const response = await appsService.create({ name, organizationId });
    consola.info(`App ID: ${response.id}`);
    consola.success('App created successfully.');
  },
});
