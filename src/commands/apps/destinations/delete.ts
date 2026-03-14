import appDestinationsService from '@/services/app-destinations.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Delete an app destination.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      destinationId: z.string().optional().describe('ID of the destination.'),
      yes: z.boolean().optional().describe('Skip confirmation prompt.'),
    }),
    { y: 'yes' },
  ),
  action: withAuth(async (options, args) => {
    let { appId, destinationId } = options;

    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizationId = await promptOrganizationSelection();
      appId = await promptAppSelection(organizationId);
    }
    if (!destinationId) {
      if (!isInteractive()) {
        consola.error('You must provide the destination ID when running in non-interactive environment.');
        process.exit(1);
      }
      const destinations = await appDestinationsService.findAll({ appId });
      if (!destinations.length) {
        consola.error('No destinations found for this app. Create one first.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      destinationId = await prompt('Select the destination to delete:', {
        type: 'select',
        options: destinations.map((dest) => ({ label: dest.name, value: dest.id })),
      });
    }
    if (!options.yes && isInteractive()) {
      const confirmed = await prompt('Are you sure you want to delete this destination?', {
        type: 'confirm',
      });
      if (!confirmed) {
        return;
      }
    }

    await appDestinationsService.delete({ appId, destinationId });
    consola.success('Destination deleted successfully.');
  }),
});
