import { DEFAULT_CONSOLE_BASE_URL } from '@/config/consts.js';
import appBuildsService from '@/services/app-builds.js';
import appDeploymentsService from '@/services/app-deployments.js';
import appDestinationsService from '@/services/app-destinations.js';
import appsService from '@/services/apps.js';
import authorizationService from '@/services/authorization-service.js';
import organizationsService from '@/services/organizations.js';
import { prompt } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { hasTTY } from 'std-env';
import { z } from 'zod';

export default defineCommand({
  description: 'Create a new app deployment.',
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
      destination: z.string().optional().describe('The name of the destination to deploy to.'),
    }),
  ),
  action: async (options) => {
    let { appId, buildId, destination } = options;

    // Check if the user is logged in
    if (!authorizationService.hasAuthorizationToken()) {
      consola.error('You must be logged in to run this command.');
      process.exit(1);
    }

    // Prompt for app ID if not provided
    if (!appId) {
      if (!hasTTY) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizations = await organizationsService.findAll();
      if (organizations.length === 0) {
        consola.error('You must create an organization before creating a deployment.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      const organizationId = await prompt('Select the organization of the app for which you want to create a deployment.', {
        type: 'select',
        options: organizations.map((organization) => ({ label: organization.name, value: organization.id })),
      });
      if (!organizationId) {
        consola.error('You must select the organization of an app for which you want to create a deployment.');
        process.exit(1);
      }
      const apps = await appsService.findAll({
        organizationId,
      });
      if (apps.length === 0) {
        consola.error('You must create an app before creating a deployment.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      appId = await prompt('Which app do you want to create a deployment for:', {
        type: 'select',
        options: apps.map((app) => ({ label: app.name, value: app.id })),
      });
      if (!appId) {
        consola.error('You must select an app to create a deployment for.');
        process.exit(1);
      }
    }

    // Prompt for build ID if not provided
    if (!buildId) {
      if (!hasTTY) {
        consola.error('You must provide a build ID when running in non-interactive environment.');
        process.exit(1);
      }
      const builds = await appBuildsService.findAll({ appId });
      if (builds.length === 0) {
        consola.error('You must create a build before creating a deployment.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      buildId = await prompt('Which build do you want to deploy:', {
        type: 'select',
        options: builds.map((build) => ({
          label: `Build #${build.number} (${build.platform} - ${build.type})`,
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

    // Prompt for destination if not provided
    if (!destination) {
      if (!hasTTY) {
        consola.error('You must provide a destination when running in non-interactive environment.');
        process.exit(1);
      }
      const destinations = await appDestinationsService.findAll({
        appId,
        platform: build.platform,
      });
      if (destinations.length === 0) {
        consola.error(`You must create a destination for the ${build.platform} platform before creating a deployment.`);
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

    // Create the deployment
    consola.start('Creating deployment...');
    const response = await appDeploymentsService.create({
      appId,
      appBuildId: buildId,
      appDestinationName: destination,
    });
    consola.success('Deployment successfully created.');
    consola.info(`Deployment ID: ${response.id}`);
    consola.info(`Deployment URL: ${DEFAULT_CONSOLE_BASE_URL}/apps/${appId}/deployments/${response.id}`);
  },
});
