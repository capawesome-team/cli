import { DEFAULT_CONSOLE_BASE_URL } from '@/config/consts.js';
import appChannelsService from '@/services/app-channels.js';
import appDeploymentsService from '@/services/app-deployments.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Update the rollout percentage of the active build in a channel.',
  options: defineOptions(
    z.object({
      appId: z
        .uuid({
          message: 'App ID must be a UUID.',
        })
        .optional()
        .describe('App ID of the channel.'),
      channel: z.string().optional().describe('Name of the channel to update rollout for.'),
      percentage: z.coerce
        .number()
        .int({
          message: 'Percentage must be an integer.',
        })
        .min(0, {
          message: 'Percentage must be at least 0.',
        })
        .max(100, {
          message: 'Percentage must be at most 100.',
        })
        .optional()
        .describe('Rollout percentage (0-100).'),
    }),
  ),
  action: withAuth(async (options) => {
    let { appId, channel, percentage } = options;

    // Prompt for app ID if not provided
    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizationId = await promptOrganizationSelection();
      appId = await promptAppSelection(organizationId);
    }

    // Prompt for channel name if not provided
    if (!channel) {
      if (!isInteractive()) {
        consola.error('You must provide a channel when running in non-interactive environment.');
        process.exit(1);
      }
      channel = await prompt('Enter the channel name to update rollout for:', {
        type: 'text',
      });
      if (!channel) {
        consola.error('You must enter a channel name to update rollout for.');
        process.exit(1);
      }
    }

    // Fetch channel by name
    const appChannels = await appChannelsService.findAll({ appId, name: channel });
    if (appChannels.length === 0) {
      consola.error(`Channel not found.`);
      process.exit(1);
    }
    const appChannelId = appChannels[0]?.id;
    if (!appChannelId) {
      consola.error('Channel ID is missing.');
      process.exit(1);
    }

    // Fetch channel with deployment relation
    const appChannel = await appChannelsService.findOneById({
      appId,
      id: appChannelId,
      relations: 'appDeployment',
    });

    // Validate that the channel has an active build assigned
    if (!appChannel.appDeployment) {
      consola.error('Channel has no active build assigned.');
      process.exit(1);
    }

    // Prompt for percentage if not provided
    if (percentage === undefined) {
      if (!isInteractive()) {
        consola.error('You must provide --percentage when running in non-interactive environment.');
        process.exit(1);
      }
      const percentageInput = await prompt('Enter the rollout percentage (0-100):', {
        type: 'text',
      });
      if (!percentageInput) {
        consola.error('You must enter a rollout percentage.');
        process.exit(1);
      }
      percentage = parseInt(percentageInput, 10);
      if (isNaN(percentage) || percentage < 0 || percentage > 100) {
        consola.error('Percentage must be a number between 0 and 100.');
        process.exit(1);
      }
    }

    // Update deployment rollout percentage
    consola.start('Updating rollout percentage...');
    const response = await appDeploymentsService.update({
      appId,
      appDeploymentId: appChannel.appDeployment.id,
      // Convert percentage from 0-100 to 0-1 for API
      rolloutPercentage: percentage / 100,
    });

    consola.info(`Deployment ID: ${response.id}`);
    consola.info(`Deployment URL: ${DEFAULT_CONSOLE_BASE_URL}/apps/${appId}/deployments/${response.id}`);
    consola.success(`Rolled out to ${percentage}%.`);
  }),
});
