import appChannelsService from '@/services/app-channels.js';
import appsService from '@/services/apps.js';
import organizationsService from '@/services/organizations.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { prompt } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Update an existing app channel.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      channelId: z.string().optional().describe('ID of the channel.'),
      name: z.string().optional().describe('Name of the channel.'),
      protected: z.boolean().optional().describe('Whether to protect the channel or not.'),
    }),
  ),
  action: withAuth(async (options, args) => {
    let { appId, channelId, name, protected: _protected } = options;

    // Prompt app ID if not provided
    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizations = await organizationsService.findAll();
      if (organizations.length === 0) {
        consola.error('You must create an organization before updating a channel.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      const organizationId = await prompt(
        'Select the organization of the app for which you want to update a channel.',
        {
          type: 'select',
          options: organizations.map((organization) => ({ label: organization.name, value: organization.id })),
        },
      );
      if (!organizationId) {
        consola.error('You must select the organization of an app for which you want to update a channel.');
        process.exit(1);
      }
      const apps = await appsService.findAll({
        organizationId,
      });
      if (!apps.length) {
        consola.error('You must create an app before updating a channel.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      appId = await prompt('Which app do you want to update the channel for?', {
        type: 'select',
        options: apps.map((app) => ({ label: app.name, value: app.id })),
      });
    }
    // Prompt for channel ID if not provided
    if (!channelId) {
      if (!isInteractive()) {
        consola.error('You must provide the channel ID when running in non-interactive environment.');
        process.exit(1);
      }
      channelId = await prompt('Enter the channel ID:', {
        type: 'text',
      });
    }
    // Update channel
    await appChannelsService.update({
      appId,
      appChannelId: channelId,
      name,
      protected: _protected,
    });
    consola.success('Channel updated successfully.');
  }),
});
