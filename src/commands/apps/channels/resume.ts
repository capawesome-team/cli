import appChannelsService from '@/services/app-channels.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Resume an app channel.',
  options: defineOptions(
    z.object({
      appId: z.string().uuid({ message: 'App ID must be a UUID.' }).optional().describe('ID of the app.'),
      channel: z.string().optional().describe('Name of the channel to resume.'),
    }),
  ),
  action: withAuth(async (options, args) => {
    let { appId, channel } = options;

    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizationId = await promptOrganizationSelection();
      appId = await promptAppSelection(organizationId);
    }

    if (!channel) {
      if (!isInteractive()) {
        consola.error('You must provide a channel when running in non-interactive environment.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      channel = await prompt('Enter the name of the channel to resume:', {
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

    await appChannelsService.resume({ appId, channelId });
    consola.success('Channel resumed successfully.');
  }),
});
