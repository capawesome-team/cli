import appConfigurationsService from '@/services/app-configurations.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Delete a native configuration.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      configurationId: z
        .string()
        .optional()
        .describe('ID of the native configuration. Either the ID or name must be provided.'),
      name: z.string().optional().describe('Name of the native configuration. Either the ID or name must be provided.'),
      yes: z.boolean().optional().describe('Skip confirmation prompt.'),
    }),
    { y: 'yes' },
  ),
  action: withAuth(async (options, args) => {
    let { appId, configurationId, name } = options;

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
      const selectedConfigurationId = await prompt('Select the native configuration to delete:', {
        type: 'select',
        options: configurations.map((configuration) => ({ label: configuration.name, value: configuration.id })),
      });
      configurationId = selectedConfigurationId;
    }

    if (!options.yes && isInteractive()) {
      const confirmed = await prompt('Are you sure you want to delete this native configuration?', {
        type: 'confirm',
      });
      if (!confirmed) {
        return;
      }
    }

    await appConfigurationsService.delete({
      appId,
      id: configurationId,
      name,
    });
    consola.success('Native configuration deleted successfully.');
  }),
});
