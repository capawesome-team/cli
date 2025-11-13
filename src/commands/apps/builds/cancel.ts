import appBuildsService from '@/services/app-builds.js';
import authorizationService from '@/services/authorization-service.js';
import jobsService from '@/services/jobs.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Cancel an app build.',
  options: defineOptions(
    z.object({
      appId: z
        .uuid({
          message: 'App ID must be a UUID.',
        })
        .describe('App ID the build belongs to.'),
      buildId: z
        .uuid({
          message: 'Build ID must be a UUID.',
        })
        .describe('Build ID to cancel.'),
    }),
  ),
  action: async (options) => {
    const { appId, buildId } = options;

    // Check if the user is logged in
    if (!authorizationService.hasAuthorizationToken()) {
      consola.error('You must be logged in to run this command.');
      process.exit(1);
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
