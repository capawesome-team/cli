import appEnvironmentsService from '@/services/app-environments.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
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
      const organizationId = await promptOrganizationSelection();
      appId = await promptAppSelection(organizationId);
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
