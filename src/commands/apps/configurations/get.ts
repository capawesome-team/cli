import appConfigurationsService from '@/services/app-configurations.js';
import { AppConfigurationDto } from '@/types/app-configuration.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import consola from 'consola';
import { z } from 'zod';
import { defineCommand, defineOptions } from 'zodline';

export default defineCommand({
  description: 'Get an existing native configuration.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      configurationId: z
        .string()
        .optional()
        .describe('ID of the native configuration. Either the ID or name must be provided.'),
      json: z.boolean().optional().describe('Output in JSON format.'),
      name: z.string().optional().describe('Name of the native configuration. Either the ID or name must be provided.'),
    }),
  ),
  action: withAuth(async (options, args) => {
    let { appId, configurationId, json, name } = options;

    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizationId = await promptOrganizationSelection();
      appId = await promptAppSelection(organizationId);
    }

    if (!configurationId && !name) {
      if (!isInteractive()) {
        consola.error(
          'You must provide either the native configuration ID or name when running in non-interactive environment.',
        );
        process.exit(1);
      }
      const configurations = await appConfigurationsService.findAll({ appId });
      if (!configurations.length) {
        consola.error('No native configurations found for this app. Create one first.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      configurationId = await prompt('Select the native configuration:', {
        type: 'select',
        options: configurations.map((configuration) => ({ label: configuration.name, value: configuration.id })),
      });
    }

    let configuration: AppConfigurationDto | undefined;
    if (configurationId) {
      configuration = await appConfigurationsService.findOneById({ appId, id: configurationId });
    } else if (name) {
      const configurations = await appConfigurationsService.findAll({ appId, name });
      configuration = configurations[0];
    }
    if (!configuration) {
      consola.error('Native configuration not found.');
      process.exit(1);
    }

    if (json) {
      console.log(JSON.stringify(configuration, null, 2));
    } else {
      console.table(configuration);
      consola.success('Native configuration retrieved successfully.');
    }
  }),
});
