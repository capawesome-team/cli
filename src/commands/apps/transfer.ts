import appsService from '@/services/apps.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Transfer an app to another organization.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      organizationId: z.string().optional().describe('ID of the target organization.'),
      yes: z.boolean().optional().describe('Skip confirmation prompt.'),
    }),
    { y: 'yes' },
  ),
  action: withAuth(async (options, args) => {
    let { appId, organizationId } = options;

    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide the app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const sourceOrganizationId = await promptOrganizationSelection();
      appId = await promptAppSelection(sourceOrganizationId);
    }
    if (!organizationId) {
      if (!isInteractive()) {
        consola.error('You must provide the organization ID when running in non-interactive environment.');
        process.exit(1);
      }
      organizationId = await promptOrganizationSelection();
    }
    if (!options.yes && isInteractive()) {
      const confirmed = await prompt('Are you sure you want to transfer this app?', {
        type: 'confirm',
      });
      if (!confirmed) {
        return;
      }
    }
    await appsService.transfer({ appId, organizationId });
    consola.success('App transferred successfully.');
  }),
});
