import { DEFAULT_CONSOLE_BASE_URL } from '@/config/consts.js';
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
      json: z.boolean().optional().describe('Output in JSON format.'),
      link: z.boolean().optional().describe('Connect the created app to the local git repository.'),
      name: z.string().optional().describe('Name of the app.'),
      organizationId: z.string().optional().describe('ID of the organization to create the app in.'),
      type: z
        .enum(['android', 'capacitor', 'cordova', 'ios'])
        .optional()
        .describe('Type of the app. Defaults to `capacitor`.'),
      yes: z.boolean().optional().describe('Skip all confirmation prompts.'),
    }),
    { y: 'yes' },
  ),
  action: withAuth(async (options, args) => {
    let { json, name, organizationId } = options;
    const type = options.type ?? 'capacitor';

    if (!organizationId) {
      if (!isInteractive()) {
        consola.error('You must provide the organization ID when running in non-interactive environment.');
        process.exit(1);
      }
      organizationId = await promptOrganizationSelection({ allowCreate: true });
    }
    if (!name) {
      if (!isInteractive()) {
        consola.error('You must provide the app name when running in non-interactive environment.');
        process.exit(1);
      }
      name = await prompt('Enter the name of the app:', { type: 'text' });
    }
    const response = await appsService.create({ name, organizationId, type });
    if (!json) {
      consola.info(`App ID: ${response.id}`);
      consola.info(`App URL: ${DEFAULT_CONSOLE_BASE_URL}/apps/${response.id}`);
      consola.success('App created successfully.');
    }

    let shouldLink = options.link ?? false;
    if (!shouldLink && !options.yes && !json && isInteractive()) {
      shouldLink = await prompt('Do you want to connect a git repository?', {
        type: 'confirm',
      });
    }
    if (shouldLink) {
      await (
        await import('@/commands/apps/link.js').then((mod) => mod.default)
      ).action({ appId: response.id }, undefined);
    }

    if (json) {
      console.log(JSON.stringify({ id: response.id }, null, 2));
    }
  }),
});
