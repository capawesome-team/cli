import { DEFAULT_CONSOLE_BASE_URL } from '@/config/consts.js';
import appChannelsService from '@/services/app-channels.js';
import appDeploymentsService from '@/services/app-deployments.js';
import appsService from '@/services/apps.js';
import authorizationService from '@/services/authorization-service.js';
import organizationsService from '@/services/organizations.js';
import { isInteractive } from '@/utils/environment.js';
import { prompt } from '@/utils/prompt.js';
import { formatTimeAgo } from '@/utils/time-format.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Rollback the active build in a channel to a previous build.',
  options: defineOptions(
    z.object({
      appId: z
        .uuid({
          message: 'App ID must be a UUID.',
        })
        .optional()
        .describe('App ID of the channel.'),
      channel: z.string().optional().describe('Name of the channel to rollback.'),
      steps: z.coerce
        .number()
        .int({
          message: 'Steps must be an integer.',
        })
        .min(1, {
          message: 'Steps must be at least 1.',
        })
        .max(5, {
          message: 'Steps cannot be more than 5.',
        })
        .optional()
        .describe('Number of deployments to go back (1-5).'),
    }),
  ),
  action: async (options) => {
    let { appId, channel, steps } = options;

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
        consola.error('You must create an organization before rolling back a deployment.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      const organizationId = await prompt(
        'Select the organization of the app for which you want to rollback a deployment.',
        {
          type: 'select',
          options: organizations.map((organization) => ({ label: organization.name, value: organization.id })),
        },
      );
      if (!organizationId) {
        consola.error('You must select the organization of an app for which you want to rollback a deployment.');
        process.exit(1);
      }
      const apps = await appsService.findAll({
        organizationId,
      });
      if (apps.length === 0) {
        consola.error('You must create an app before rolling back a deployment.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      appId = await prompt('Which app do you want to rollback a deployment for:', {
        type: 'select',
        options: apps.map((app) => ({ label: app.name, value: app.id })),
      });
      if (!appId) {
        consola.error('You must select an app to rollback a deployment for.');
        process.exit(1);
      }
    }

    // Prompt for channel name if not provided
    if (!channel) {
      if (!isInteractive()) {
        consola.error('You must provide a channel name when running in non-interactive environment.');
        process.exit(1);
      }
      channel = await prompt('Enter the channel name to rollback:', {
        type: 'text',
      });
      if (!channel) {
        consola.error('You must enter a channel name to rollback.');
        process.exit(1);
      }
    }

    // Fetch channel by name
    const appChannels = await appChannelsService.findAll({ appId, name: channel });
    if (appChannels.length === 0) {
      consola.error('Channel not found.');
      process.exit(1);
    }
    const appChannelId = appChannels[0]?.id;

    // Fetch deployments for the channel
    const appDeployments = await appDeploymentsService.findAll({
      appId,
      appChannelId,
      limit: 5,
      relations: 'appBuild',
    });

    // Validate that we have at least 2 app deployments (current + previous)
    if (appDeployments.length < 2) {
      consola.error('Channel has no previous deployments to rollback to.');
      process.exit(1);
    }

    // Select deployment to rollback to
    let selectedIndex: number;

    if (steps === undefined) {
      // Interactive selection (exclude index 0 - current deployment)
      if (!isInteractive()) {
        consola.error('You must provide --steps when running in non-interactive environment.');
        process.exit(1);
      }

      // Build options for select prompt (skip index 0)
      const options = appDeployments.slice(1).map((deployment, index) => {
        const appBuild = appDeployments[index + 1]?.appBuild;
        if (!appBuild) {
          consola.error('Deployment is missing associated build.');
          process.exit(1);
        }
        const deployedTime = deployment.job?.createdAt ? formatTimeAgo(deployment.job.createdAt) : 'unknown';
        return {
          label: `Build #${appBuild.numberAsString} - Deployed ${deployedTime}`,
          value: (index + 1).toString(),
        };
      });

      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      const selectedValue = await prompt('Which deployment do you want to rollback to:', {
        type: 'select',
        options,
      });

      if (!selectedValue) {
        consola.error('You must select a deployment to rollback to.');
        process.exit(1);
      }

      selectedIndex = parseInt(selectedValue, 10);
    } else {
      // Validate steps value
      if (steps >= appDeployments.length) {
        consola.error(
          `Cannot rollback ${steps} step${steps === 1 ? '' : 's'}, only ${appDeployments.length - 1} previous deployment${appDeployments.length - 1 === 1 ? '' : 's'} available.`,
        );
        process.exit(1);
      }
      selectedIndex = steps;
    }

    // Get the selected deployment and build
    const selectedAppDeployment = appDeployments[selectedIndex];
    if (!selectedAppDeployment) {
      consola.error('Selected deployment not found.');
      process.exit(1);
    }

    // Create new deployment with the selected build
    consola.start('Creating rollback deployment...');
    const response = await appDeploymentsService.create({
      appId,
      appBuildId: selectedAppDeployment.appBuildId,
      appChannelName: channel,
    });

    consola.success(
      `Rolled back to Build #${selectedAppDeployment.appBuild?.numberAsString} (${selectedIndex} step${selectedIndex === 1 ? '' : 's'} back).`,
    );
    consola.info(`Deployment ID: ${response.id}`);
    consola.info(`Deployment URL: ${DEFAULT_CONSOLE_BASE_URL}/apps/${appId}/deployments/${response.id}`);
  },
});
