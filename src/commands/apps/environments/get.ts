import appEnvironmentsService from '@/services/app-environments.js';
import { AppEnvironmentDto } from '@/types/app-environment.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Get an existing environment.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      environmentId: z.string().optional().describe('ID of the environment. Either the ID or name must be provided.'),
      name: z.string().optional().describe('Name of the environment. Either the ID or name must be provided.'),
      json: z.boolean().optional().describe('Output in JSON format.'),
    }),
  ),
  action: withAuth(async (options, args) => {
    let { appId, environmentId, name, json } = options;

    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizationId = await promptOrganizationSelection();
      appId = await promptAppSelection(organizationId);
    }

    if (!environmentId && !name) {
      if (!isInteractive()) {
        consola.error(
          'You must provide either the environment ID or name when running in non-interactive environment.',
        );
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

    const relations = 'appEnvironmentVariables,appEnvironmentSecrets';
    let environment: AppEnvironmentDto | undefined;
    if (environmentId) {
      environment = await appEnvironmentsService.findOneById({ appId, id: environmentId, relations });
    } else if (name) {
      const environments = await appEnvironmentsService.findAll({ appId, name, relations });
      environment = environments[0];
    }
    if (!environment) {
      consola.error('Environment not found.');
      process.exit(1);
    }

    if (json) {
      console.log(JSON.stringify(environment, null, 2));
    } else {
      const { appEnvironmentVariables, appEnvironmentSecrets, ...rest } = environment;
      console.table(rest);
      if (appEnvironmentVariables?.length) {
        console.table(appEnvironmentVariables.map(({ id, key, value }) => ({ id, key, value })));
      }
      if (appEnvironmentSecrets?.length) {
        console.table(appEnvironmentSecrets.map(({ id, key }) => ({ id, key })));
      }
      consola.success('Environment retrieved successfully.');
    }
  }),
});
