import appsService from '@/services/apps.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Delete an app.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      yes: z.boolean().optional().describe('Skip confirmation prompt.'),
    }),
    { y: 'yes' },
  ),
  action: withAuth(async (options, args) => {
    let { appId } = options;

    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide the app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizationId = await promptOrganizationSelection();
      appId = await promptAppSelection(organizationId);
    }
    if (!options.yes && isInteractive()) {
      const confirmed = await prompt('Are you sure you want to delete this app?', {
        type: 'confirm',
      });
      if (!confirmed) {
        return;
      }
    }
    await appsService.delete({ id: appId });
    consola.success('App deleted successfully.');
  }),
});
