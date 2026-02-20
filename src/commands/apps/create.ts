import appsService from '@/services/apps.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { prompt, promptOrganizationSelection } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Create a new app.',
  options: defineOptions(
    z.object({
      name: z.string().optional().describe('Name of the app.'),
      organizationId: z.string().optional().describe('ID of the organization to create the app in.'),
    }),
  ),
  action: withAuth(async (options, args) => {
    let { name, organizationId } = options;

    if (!organizationId) {
      if (!isInteractive()) {
        consola.error('You must provide the organization ID when running in non-interactive environment.');
        process.exit(1);
      }
      organizationId = await promptOrganizationSelection();
    }
    if (!name) {
      if (!isInteractive()) {
        consola.error('You must provide the app name when running in non-interactive environment.');
        process.exit(1);
      }
      name = await prompt('Enter the name of the app:', { type: 'text' });
    }
    const response = await appsService.create({ name, organizationId });
    consola.info(`App ID: ${response.id}`);
    consola.success('App created successfully.');
  }),
});
