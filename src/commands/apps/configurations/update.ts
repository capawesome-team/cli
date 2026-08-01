import appConfigurationsService from '@/services/app-configurations.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Update an existing native configuration.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      configurationId: z.string().optional().describe('ID of the native configuration.'),
      displayName: z.string().optional().describe('Display name of the app. Pass an empty string to clear it.'),
      json: z.boolean().optional().describe('Output in JSON format.'),
      name: z.string().optional().describe('Name of the native configuration.'),
      packageName: z
        .string()
        .optional()
        .describe('Package name (bundle ID) of the app. Pass an empty string to clear it.'),
    }),
  ),
  action: withAuth(async (options, args) => {
    let { appId, configurationId, displayName, json, name, packageName } = options;

    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizationId = await promptOrganizationSelection();
      appId = await promptAppSelection(organizationId);
    }

    if (!configurationId) {
      if (!isInteractive()) {
        consola.error('You must provide the native configuration ID when running in non-interactive environment.');
        process.exit(1);
      }
      const configurations = await appConfigurationsService.findAll({ appId });
      if (!configurations.length) {
        consola.error('No native configurations found for this app. Create one first.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      configurationId = await prompt('Select the native configuration to update:', {
        type: 'select',
        options: configurations.map((configuration) => ({ label: configuration.name, value: configuration.id })),
      });
    }

    const configuration = await appConfigurationsService.update({
      appId,
      configurationId,
      displayName: displayName === '' ? null : displayName,
      name,
      packageName: packageName === '' ? null : packageName,
    });
    if (json) {
      console.log(JSON.stringify(configuration, null, 2));
    } else {
      consola.success('Native configuration updated successfully.');
    }
  }),
});
