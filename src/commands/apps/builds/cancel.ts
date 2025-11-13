import appBuildsService from '@/services/app-builds.js';
import appsService from '@/services/apps.js';
import authorizationService from '@/services/authorization-service.js';
import jobsService from '@/services/jobs.js';
import organizationsService from '@/services/organizations.js';
import { prompt } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { hasTTY } from 'std-env';
import { z } from 'zod';

export default defineCommand({
  description: 'Cancel an app build.',
  options: defineOptions(
    z.object({
      appId: z
        .uuid({
          message: 'App ID must be a UUID.',
        })
        .optional()
        .describe('App ID the build belongs to.'),
      buildId: z
        .uuid({
          message: 'Build ID must be a UUID.',
        })
        .optional()
        .describe('Build ID to cancel.'),
    }),
  ),
  action: async (options) => {
    let { appId, buildId } = options;

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
        consola.error('You must create an organization before canceling a build.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      const organizationId = await prompt('Select the organization of the app for which you want to cancel a build.', {
        type: 'select',
        options: organizations.map((organization) => ({ label: organization.name, value: organization.id })),
      });
      if (!organizationId) {
        consola.error('You must select the organization of an app for which you want to cancel a build.');
        process.exit(1);
      }
      const apps = await appsService.findAll({
        organizationId,
      });
      if (apps.length === 0) {
        consola.error('You must create an app before canceling a build.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      appId = await prompt('Which app do you want to cancel a build for:', {
        type: 'select',
        options: apps.map((app) => ({ label: app.name, value: app.id })),
      });
      if (!appId) {
        consola.error('You must select an app to cancel a build for.');
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
        consola.error('No builds found for this app.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      buildId = await prompt('Which build do you want to cancel:', {
        type: 'select',
        options: builds.map((build) => ({
          label: `Build #${build.number || build.id} (${build.platform} - ${build.type})`,
          value: build.id,
        })),
      });
      if (!buildId) {
        consola.error('You must select a build to cancel.');
        process.exit(1);
      }
    }

    // Fetch the build details to get the job ID
    consola.start('Fetching build details...');
    const build = await appBuildsService.findOne({ appId, appBuildId: buildId });

    if (!build.jobId) {
      consola.error('Build does not have an associated job ID.');
      process.exit(1);
    }

    // Cancel the job
    consola.start('Canceling build...');
    await jobsService.update({
      jobId: build.jobId,
      dto: { status: 'canceled' },
    });

    consola.success('Build successfully canceled.');
  },
});
