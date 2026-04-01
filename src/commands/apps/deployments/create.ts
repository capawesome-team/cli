import { DEFAULT_CONSOLE_BASE_URL } from '@/config/consts.js';
import appBuildsService from '@/services/app-builds.js';
import appDeploymentsService from '@/services/app-deployments.js';
import appDestinationsService from '@/services/app-destinations.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { waitForJobCompletion } from '@/utils/job.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Create a new app deployment on Capawesome Cloud.',
  options: defineOptions(
    z.object({
      appId: z
        .uuid({
          message: 'App ID must be a UUID.',
        })
        .optional()
        .describe('App ID to create the deployment for.'),
      buildId: z
        .uuid({
          message: 'Build ID must be a UUID.',
        })
        .optional()
        .describe('Build ID to deploy.'),
      buildNumber: z.string().optional().describe('Build number to deploy (e.g., "1", "42").'),
      channel: z.string().optional().describe('The name of the channel to deploy to (Web only).'),
      destination: z.string().optional().describe('The name of the destination to deploy to (Android/iOS only).'),
      detached: z
        .boolean()
        .optional()
        .describe('Exit immediately after creating the deployment without waiting for completion.'),
    }),
  ),
  action: withAuth(async (options) => {
    let { appId, buildId, buildNumber, channel, destination } = options;

    // Prompt for app ID if not provided
    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizationId = await promptOrganizationSelection({ allowCreate: true });
      appId = await promptAppSelection(organizationId, { allowCreate: true });
    }

    // Convert build number to build ID if provided
    if (!buildId && buildNumber) {
      const builds = await appBuildsService.findAll({ appId, numberAsString: buildNumber });
      if (builds.length === 0) {
        consola.error(`Build #${buildNumber} not found.`);
        process.exit(1);
      }
      buildId = builds[0]?.id;
    }

    // Prompt for build ID if not provided
    if (!buildId) {
      if (!isInteractive()) {
        consola.error('You must provide a build ID when running in non-interactive environment.');
        process.exit(1);
      }
      // Prompt for platform selection
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      const platform = await prompt('Select the platform of the build you want to deploy:', {
        type: 'select',
        options: [
          { label: 'Android', value: 'android' },
          { label: 'iOS', value: 'ios' },
          { label: 'Web', value: 'web' },
        ],
      });
      if (!platform) {
        consola.error('You must select a platform.');
        process.exit(1);
      }
      if (platform !== 'android' && platform !== 'ios' && platform !== 'web') {
        consola.error('Invalid platform selected.');
        process.exit(1);
      }
      const builds = await appBuildsService.findAll({ appId, platform: platform });
      if (builds.length === 0) {
        consola.error('You must create a build before creating a deployment.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      buildId = await prompt('Select the build you want to deploy:', {
        type: 'select',
        options: builds.map((build) => ({
          label:
            build.platform === 'web'
              ? `Build #${build.numberAsString}`
              : `Build #${build.numberAsString} (${build.type})`,
          value: build.id,
        })),
      });
      if (!buildId) {
        consola.error('You must select a build to deploy.');
        process.exit(1);
      }
    }

    // Get build information to determine platform
    const build = await appBuildsService.findOne({ appId, appBuildId: buildId });

    // Handle destination/channel selection based on platform
    if (build.platform === 'web') {
      // Web deployments use channels
      if (!channel) {
        if (!isInteractive()) {
          consola.error('You must provide a channel when running in non-interactive environment.');
          process.exit(1);
        }
        channel = await prompt('Enter the channel name to deploy to:', {
          type: 'text',
        });
        if (!channel) {
          consola.error('You must enter a channel name to deploy to.');
          process.exit(1);
        }
      }
    } else {
      // Android/iOS deployments use destinations
      if (!destination) {
        if (!isInteractive()) {
          consola.error('You must provide a destination when running in non-interactive environment.');
          process.exit(1);
        }
        const destinations = await appDestinationsService.findAll({
          appId,
          platform: build.platform,
        });
        if (destinations.length === 0) {
          consola.error(
            `You must create a destination for the ${build.platform} platform before creating a deployment.`,
          );
          process.exit(1);
        }
        // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
        destination = await prompt('Which destination do you want to deploy to:', {
          type: 'select',
          options: destinations.map((dest) => ({
            label: dest.name,
            value: dest.name,
          })),
        });
        if (!destination) {
          consola.error('You must select a destination to deploy to.');
          process.exit(1);
        }
      }
    }

    // Create the deployment
    consola.start('Creating deployment...');
    const response = await appDeploymentsService.create({
      appId,
      appBuildId: buildId,
      appDestinationName: build.platform === 'web' ? undefined : destination,
      appChannelName: build.platform === 'web' ? channel : undefined,
    });
    consola.info(`Deployment ID: ${response.id}`);
    consola.info(`Deployment URL: ${DEFAULT_CONSOLE_BASE_URL}/apps/${appId}/deployments/${response.id}`);
    consola.success('Deployment created successfully.');

    // Wait for deployment job to complete by default, unless --detached flag is set
    const shouldWait = !options.detached && build.platform !== 'web';
    if (shouldWait) {
      await waitForJobCompletion({ jobId: response.jobId });
      consola.success('Deployment completed successfully.');
      process.exit(0);
    }
  }),
});
