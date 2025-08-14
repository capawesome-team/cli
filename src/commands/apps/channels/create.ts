import consola from 'consola';
import { z } from 'zod';
import { defineCommand, defineOptions } from 'zodest/config';
import appChannelsService from '../../../services/app-channels.js';
import appsService from '../../../services/apps.js';
import organizationsService from '../../../services/organizations.js';
import { getMessageFromUnknownError } from '../../../utils/error.js';
import { prompt } from '../../../utils/prompt.js';

export default defineCommand({
  description: 'Create a new app channel.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      bundleLimit: z.coerce
        .number()
        .optional()
        .describe(
          'Maximum number of bundles that can be assigned to the channel. If more bundles are assigned, the oldest bundles will be automatically deleted.',
        ),
      ignoreErrors: z.boolean().optional().describe('Whether to ignore errors or not.'),
      name: z.string().optional().describe('Name of the channel.'),
    }),
  ),
  action: async (options, args) => {
    let { appId, bundleLimit, ignoreErrors, name } = options;

    // Validate the app ID
    if (!appId) {
      const organizations = await organizationsService.findAll();
      if (organizations.length === 0) {
        consola.error('You must create an organization before creating a channel.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      const organizationId = await prompt(
        'Select the organization of the app for which you want to create a channel.',
        {
          type: 'select',
          options: organizations.map((organization) => ({ label: organization.name, value: organization.id })),
        },
      );
      if (!organizationId) {
        consola.error('You must select the organization of an app for which you want to create a channel.');
        process.exit(1);
      }
      const apps = await appsService.findAll({
        organizationId,
      });
      if (!apps.length) {
        consola.error('You must create an app before creating a channel.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      appId = await prompt('Which app do you want to create the channel for?', {
        type: 'select',
        options: apps.map((app) => ({ label: app.name, value: app.id })),
      });
    }
    // Validate the channel name
    if (!name) {
      name = await prompt('Enter the name of the channel:', { type: 'text' });
    }
    try {
      const response = await appChannelsService.create({
        appId,
        name,
        totalAppBundleLimit: bundleLimit,
      });
      consola.success('Channel created successfully.');
      consola.info(`Channel ID: ${response.id}`);
    } catch (error) {
      const message = getMessageFromUnknownError(error);
      consola.error(message);
      process.exit(ignoreErrors ? 0 : 1);
    }
  },
});
