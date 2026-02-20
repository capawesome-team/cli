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
  description: 'Pause an app channel.',
  options: defineOptions(
    z.object({
      appId: z.string().uuid({ message: 'App ID must be a UUID.' }).optional().describe('ID of the app.'),
      channel: z.string().optional().describe('Name of the channel to pause.'),
    }),
  ),
  action: withAuth(async (options, args) => {
    let { appId, channel } = options;

    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizations = await organizationsService.findAll();
      if (organizations.length === 0) {
        consola.error('You must create an organization before pausing a channel.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      const organizationId = await prompt('Select the organization of the app.', {
        type: 'select',
        options: organizations.map((organization) => ({ label: organization.name, value: organization.id })),
      });
      if (!organizationId) {
        consola.error('You must select the organization of the app.');
        process.exit(1);
      }
      const apps = await appsService.findAll({
        organizationId,
      });
      if (!apps.length) {
        consola.error('You must create an app before pausing a channel.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      appId = await prompt('Which app do you want to pause the channel in?', {
        type: 'select',
        options: apps.map((app) => ({ label: app.name, value: app.id })),
      });
      if (!appId) {
        consola.error('You must select an app.');
        process.exit(1);
      }
    }

    if (!channel) {
      if (!isInteractive()) {
        consola.error('You must provide a channel when running in non-interactive environment.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      channel = await prompt('Enter the name of the channel to pause:', {
        type: 'text',
      });
      if (!channel) {
        consola.error('You must provide a channel name.');
        process.exit(1);
      }
    }

    const channels = await appChannelsService.findAll({ appId, name: channel });
    if (channels.length === 0) {
      consola.error('Channel not found.');
      process.exit(1);
    }

    const channelId = channels[0]?.id;
    if (!channelId) {
      consola.error('Channel ID not found.');
      process.exit(1);
    }

    await appChannelsService.pause({ appId, channelId });
    consola.success('Channel paused successfully.');
  }),
});
