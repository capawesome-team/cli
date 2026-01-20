import { DEFAULT_CONSOLE_BASE_URL } from '@/config/consts.js';
import appChannelsService from '@/services/app-channels.js';
import appDeploymentsService from '@/services/app-deployments.js';
import appsService from '@/services/apps.js';
import authorizationService from '@/services/authorization-service.js';
import organizationsService from '@/services/organizations.js';
import { isInteractive } from '@/utils/environment.js';
import { prompt } from '@/utils/prompt.js';
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
          message: 'Percentage cannot exceed 100.',
        })
        .optional()
        .describe('Rollout percentage (0-100).'),
    }),
  ),
  action: async (options) => {
    let { appId, channel, percentage } = options;

    // Check if the user is logged in
    if (!authorizationService.hasAuthorizationToken()) {
      consola.error('You must be logged in to run this command. Please run the `login` command first.');
      process.exit(1);
    }

    // Prompt for app ID if not provided
    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizations = await organizationsService.findAll();
      if (organizations.length === 0) {
        consola.error('You must create an organization before updating a rollout percentage.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      const organizationId = await prompt(
        'Select the organization of the app for which you want to update the rollout percentage.',
        {
          type: 'select',
          options: organizations.map((organization) => ({ label: organization.name, value: organization.id })),
        },
      );
      if (!organizationId) {
        consola.error(
          'You must select the organization of an app for which you want to update the rollout percentage.',
        );
        process.exit(1);
      }
      const apps = await appsService.findAll({
        organizationId,
      });
      if (apps.length === 0) {
        consola.error('You must create an app before updating a rollout percentage.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      appId = await prompt('Which app do you want to update the rollout percentage for:', {
        type: 'select',
        options: apps.map((app) => ({ label: app.name, value: app.id })),
      });
      if (!appId) {
        consola.error('You must select an app to update the rollout percentage for.');
        process.exit(1);
      }
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

    // Convert percentage from 0-100 to 0-1 for API
    const rolloutPercentage = percentage / 100;

    // Update deployment rollout percentage
    consola.start('Updating rollout percentage...');
    const response = await appDeploymentsService.update({
      appId,
      appDeploymentId: appChannel.appDeployment.id,
      rolloutPercentage,
    });

    consola.success(`Rolled out to ${percentage}%.`);
    consola.info(`Deployment ID: ${response.id}`);
    consola.info(`Deployment URL: ${DEFAULT_CONSOLE_BASE_URL}/apps/${appId}/deployments/${response.id}`);
  },
});
