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
  description: 'Unset environment variables and secrets.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      environmentId: z.string().optional().describe('ID of the environment.'),
      variable: z
        .array(z.string())
        .optional()
        .describe('Key of the environment variable to unset. Can be specified multiple times.'),
      secret: z
        .array(z.string())
        .optional()
        .describe('Key of the environment secret to unset. Can be specified multiple times.'),
    }),
  ),
  action: withAuth(async (options, args) => {
    let { appId, environmentId, variable: variableKeys, secret: secretKeys } = options;

    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizations = await organizationsService.findAll();
      if (organizations.length === 0) {
        consola.error('You must create an organization before unsetting environment variables or secrets.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      const organizationId = await prompt(
        'Select the organization of the app for which you want to unset environment variables or secrets.',
        {
          type: 'select',
          options: organizations.map((organization) => ({ label: organization.name, value: organization.id })),
        },
      );
      if (!organizationId) {
        consola.error(
          'You must select the organization of an app for which you want to unset environment variables or secrets.',
        );
        process.exit(1);
      }
      const apps = await appsService.findAll({
        organizationId,
      });
      if (!apps.length) {
        consola.error('You must create an app before unsetting environment variables or secrets.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      appId = await prompt('Which app do you want to unset the environment variables or secrets for?', {
        type: 'select',
        options: apps.map((app) => ({ label: app.name, value: app.id })),
      });
    }

    if (!environmentId) {
      if (!isInteractive()) {
        consola.error('You must provide an environment ID when running in non-interactive environment.');
        process.exit(1);
      }
      const environments = await appEnvironmentsService.findAll({ appId });
      if (!environments.length) {
        consola.error('No environments found for this app. Create one first.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      environmentId = await prompt('Select the environment:', {
        type: 'select',
        options: environments.map((env) => ({ label: env.name, value: env.id })),
      });
    }

    if (!variableKeys?.length && !secretKeys?.length) {
      consola.error('You must provide at least one variable key or secret key to unset.');
      process.exit(1);
    }

    if (variableKeys?.length) {
      await appEnvironmentsService.unsetVariables({
        appId,
        environmentId,
        keys: variableKeys,
      });
    }

    if (secretKeys?.length) {
      await appEnvironmentsService.unsetSecrets({
        appId,
        environmentId,
        keys: secretKeys,
      });
    }

    consola.success('Environment variables and secrets unset successfully.');
  }),
});
