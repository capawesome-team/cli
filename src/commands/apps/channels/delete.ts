import appChannelsService from '@/services/app-channels.js';
import { withAuth } from '@/utils/auth.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { isInteractive } from '@/utils/environment.js';
import { z } from 'zod';

export default defineCommand({
  description: 'Delete an app channel.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      channelId: z
        .string()
        .optional()
        .describe('ID of the channel. Either the ID or name of the channel must be provided.'),
      name: z
        .string()
        .optional()
        .describe('Name of the channel. Either the ID or name of the channel must be provided.'),
      yes: z.boolean().optional().describe('Skip confirmation prompt.'),
    }),
    { y: 'yes' },
  ),
  action: withAuth(async (options, args) => {
    let { appId, channelId, name } = options;

    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizationId = await promptOrganizationSelection();
      appId = await promptAppSelection(organizationId);
    }
    // Prompt for channel ID or name if neither is provided
    if (!channelId && !name) {
      if (!isInteractive()) {
        consola.error('You must provide either the channel ID or name when running in non-interactive environment.');
        process.exit(1);
      }
      const channels = await appChannelsService.findAll({ appId });
      if (!channels.length) {
        consola.error('No channels found for this app. Create one first.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      const selectedChannelId = await prompt('Select the channel to delete:', {
        type: 'select',
        options: channels.map((channel) => ({ label: channel.name, value: channel.id })),
      });
      channelId = selectedChannelId;
    }
    // Confirm deletion
    if (!options.yes && isInteractive()) {
      const confirmed = await prompt('Are you sure you want to delete this channel?', {
        type: 'confirm',
      });
      if (!confirmed) {
        return;
      }
    }
    // Delete channel
    await appChannelsService.delete({
      appId,
      id: channelId,
      name,
    });
    consola.success('Channel deleted successfully.');
  }),
});
