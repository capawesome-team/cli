import appEnvironmentsService from '@/services/app-environments.js';
import appsService from '@/services/apps.js';
import authorizationService from '@/services/authorization-service.js';
import organizationsService from '@/services/organizations.js';
import { isInteractive } from '@/utils/environment.js';
import { prompt } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Delete an environment.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      environmentId: z.string().optional().describe('ID of the environment. Either the ID or name must be provided.'),
      name: z.string().optional().describe('Name of the environment. Either the ID or name must be provided.'),
    }),
  ),
  action: async (options, args) => {
    let { appId, environmentId, name } = options;

    if (!authorizationService.hasAuthorizationToken()) {
      consola.error('You must be logged in to run this command. Please run the `login` command first.');
      process.exit(1);
    }

    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizations = await organizationsService.findAll();
      if (organizations.length === 0) {
        consola.error('You must create an organization before deleting an environment.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      const organizationId = await prompt(
        'Select the organization of the app from which you want to delete an environment.',
        {
          type: 'select',
          options: organizations.map((organization) => ({ label: organization.name, value: organization.id })),
        },
      );
      if (!organizationId) {
        consola.error('You must select the organization of an app from which you want to delete an environment.');
        process.exit(1);
      }
      const apps = await appsService.findAll({
        organizationId,
      });
      if (!apps.length) {
        consola.error('You must create an app before deleting an environment.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      appId = await prompt('Which app do you want to delete the environment from?', {
        type: 'select',
        options: apps.map((app) => ({ label: app.name, value: app.id })),
      });
    }

    if (!environmentId && !name) {
      if (!isInteractive()) {
        consola.error(
          'You must provide either the environment ID or name when running in non-interactive environment.',
        );
        process.exit(1);
      }
      name = await prompt('Enter the environment name:', {
        type: 'text',
      });
    }

    if (isInteractive()) {
      const confirmed = await prompt('Are you sure you want to delete this environment?', {
        type: 'confirm',
      });
      if (!confirmed) {
        return;
      }
    }

    await appEnvironmentsService.delete({
      appId,
      id: environmentId,
      name,
    });
    consola.success('Environment deleted successfully.');
  },
});
