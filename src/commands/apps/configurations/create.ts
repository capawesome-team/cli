import appConfigurationsService from '@/services/app-configurations.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Create a new native configuration.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      displayName: z.string().optional().describe('Display name of the app.'),
      json: z.boolean().optional().describe('Output in JSON format.'),
      name: z.string().optional().describe('Name of the native configuration.'),
      packageName: z.string().optional().describe('Package name (bundle ID) of the app.'),
    }),
  ),
  action: withAuth(async (options, args) => {
    let { appId, displayName, json, name, packageName } = options;

    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizationId = await promptOrganizationSelection({ allowCreate: true });
      appId = await promptAppSelection(organizationId, { allowCreate: true });
    }

    if (!name) {
      if (!isInteractive()) {
        consola.error('You must provide the native configuration name when running in non-interactive environment.');
        process.exit(1);
      }
      name = await prompt('Enter the name of the native configuration:', { type: 'text' });
    }

    const response = await appConfigurationsService.create({
      appId,
      displayName: displayName === '' ? null : displayName,
      name,
      packageName: packageName === '' ? null : packageName,
    });
    if (json) {
      console.log(JSON.stringify({ id: response.id }, null, 2));
    } else {
      consola.info(`Native configuration ID: ${response.id}`);
      consola.success('Native configuration created successfully.');
    }
  }),
});
