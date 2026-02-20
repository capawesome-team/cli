import appEnvironmentsService from '@/services/app-environments.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
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
      yes: z.boolean().optional().describe('Skip confirmation prompt.'),
    }),
    { y: 'yes' },
  ),
  action: withAuth(async (options, args) => {
    let { appId, environmentId, name } = options;

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
      const selectedEnvironmentId = await prompt('Select the environment to delete:', {
        type: 'select',
        options: environments.map((env) => ({ label: env.name, value: env.id })),
      });
      environmentId = selectedEnvironmentId;
    }

    if (!options.yes && isInteractive()) {
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
  }),
});
