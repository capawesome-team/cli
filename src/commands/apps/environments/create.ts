import appEnvironmentsService from '@/services/app-environments.js';
import appsService from '@/services/apps.js';
import organizationsService from '@/services/organizations.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { prompt } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Create a new environment.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      name: z.string().optional().describe('Name of the environment.'),
    }),
  ),
  action: withAuth(async (options, args) => {
    let { appId, name } = options;

    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizations = await organizationsService.findAll();
      if (organizations.length === 0) {
        consola.error('You must create an organization before creating an environment.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      const organizationId = await prompt(
        'Select the organization of the app for which you want to create an environment.',
        {
          type: 'select',
          options: organizations.map((organization) => ({ label: organization.name, value: organization.id })),
        },
      );
      if (!organizationId) {
        consola.error('You must select the organization of an app for which you want to create an environment.');
        process.exit(1);
      }
      const apps = await appsService.findAll({
        organizationId,
      });
      if (!apps.length) {
        consola.error('You must create an app before creating an environment.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      appId = await prompt('Which app do you want to create the environment for?', {
        type: 'select',
        options: apps.map((app) => ({ label: app.name, value: app.id })),
      });
    }

    if (!name) {
      if (!isInteractive()) {
        consola.error('You must provide the environment name when running in non-interactive environment.');
        process.exit(1);
      }
      name = await prompt('Enter the name of the environment:', { type: 'text' });
    }

    const response = await appEnvironmentsService.create({
      appId,
      name,
    });
    consola.info(`Environment ID: ${response.id}`);
    consola.success('Environment created successfully.');
  }),
});
