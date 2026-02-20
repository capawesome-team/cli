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
      const organizations = await organizationsService.findAll();
      if (organizations.length === 0) {
        consola.error('You must create an organization before listing environments.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      const organizationId = await prompt(
        'Select the organization of the app for which you want to list environments.',
        {
          type: 'select',
          options: organizations.map((organization) => ({ label: organization.name, value: organization.id })),
        },
      );
      if (!organizationId) {
        consola.error('You must select the organization of an app for which you want to list environments.');
        process.exit(1);
      }
      const apps = await appsService.findAll({
        organizationId,
      });
      if (!apps.length) {
        consola.error('You must create an app before listing environments.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      appId = await prompt('Which app do you want to list the environments for?', {
        type: 'select',
        options: apps.map((app) => ({ label: app.name, value: app.id })),
      });
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
