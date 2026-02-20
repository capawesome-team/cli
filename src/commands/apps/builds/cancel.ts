import appBuildsService from '@/services/app-builds.js';
import jobsService from '@/services/jobs.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
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
  action: withAuth(async (options) => {
    let { appId, buildId } = options;

    // Prompt for app ID if not provided
    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizationId = await promptOrganizationSelection();
      appId = await promptAppSelection(organizationId);
    }

    // Prompt for build ID if not provided
    if (!buildId) {
      if (!isInteractive()) {
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
          label: `Build #${build.numberAsString || build.id} (${build.platform} - ${build.type})`,
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

    // Cancel the job
    consola.start('Canceling build...');
    await jobsService.update({
      jobId: build.jobId,
      dto: { status: 'canceled' },
    });

    consola.success('Build successfully canceled.');
  }),
});
