import appChannelsService from '@/services/app-channels.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
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
      const organizationId = await promptOrganizationSelection();
      appId = await promptAppSelection(organizationId);
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
