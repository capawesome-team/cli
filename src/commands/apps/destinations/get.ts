import appDestinationsService from '@/services/app-destinations.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Get an existing app destination.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      destinationId: z.string().optional().describe('ID of the destination.'),
      json: z.boolean().optional().describe('Output in JSON format.'),
      name: z.string().optional().describe('Name of the destination.'),
      platform: z.enum(['android', 'ios']).optional().describe('Platform of the destination (android, ios).'),
    }),
  ),
  action: withAuth(async (options, args) => {
    let { appId, destinationId, name, platform } = options;

    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizationId = await promptOrganizationSelection();
      appId = await promptAppSelection(organizationId);
    }
    if (!destinationId) {
      if (name && platform) {
        const destinations = await appDestinationsService.findAll({ appId, name, platform });
        const firstDestination = destinations[0];
        if (!firstDestination) {
          consola.error(`No destination found with name '${name}' and platform '${platform}'.`);
          process.exit(1);
        }
        destinationId = firstDestination.id;
      } else if (isInteractive()) {
        if (!platform) {
          // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
          platform = await prompt('Select the platform:', {
            type: 'select',
            options: [
              { label: 'Android', value: 'android' },
              { label: 'iOS', value: 'ios' },
            ],
          });
        }
        const destinations = await appDestinationsService.findAll({ appId, platform });
        if (!destinations.length) {
          consola.error('No destinations found for this app. Create one first.');
          process.exit(1);
        }
        // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
        destinationId = await prompt('Select the destination:', {
          type: 'select',
          options: destinations.map((dest) => ({ label: dest.name, value: dest.id })),
        });
      } else {
        consola.error('You must provide the destination ID or --name and --platform when running in non-interactive environment.');
        process.exit(1);
      }
    }

    const destination = await appDestinationsService.findOneById({
      appId,
      destinationId,
    });
    if (options.json) {
      console.log(JSON.stringify(destination, null, 2));
    } else {
      console.table(destination);
      consola.success('Destination retrieved successfully.');
    }
  }),
});
