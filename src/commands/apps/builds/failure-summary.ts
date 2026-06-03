import appBuildsService from '@/services/app-builds.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { printJobFailureSummary } from '@/utils/job-failure-summary.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Explain why an app build failed using Capawesome Cloud Assist (AI).',
  options: defineOptions(
    z.object({
      appId: z
        .uuid({
          message: 'App ID must be a UUID.',
        })
        .optional()
        .describe('App ID of the build to summarize.'),
      buildId: z
        .uuid({
          message: 'Build ID must be a UUID.',
        })
        .optional()
        .describe('Build ID to summarize.'),
      buildNumber: z.string().optional().describe('Build number to summarize (e.g., "1", "42").'),
    }),
  ),
  action: withAuth(async (options) => {
    let { appId, buildId, buildNumber } = options;

    // Prompt for app ID if not provided
    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizationId = await promptOrganizationSelection();
      appId = await promptAppSelection(organizationId);
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
      const appBuilds = await appBuildsService.findAll({ appId });
      if (appBuilds.length === 0) {
        consola.error('There are no builds for this app.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      buildId = await prompt('Which build do you want a failure summary for?', {
        type: 'select',
        options: appBuilds.map((build) => ({
          label: `Build #${build.numberAsString} (${build.platform} - ${build.type})`,
          value: build.id,
        })),
      });
      if (!buildId) {
        consola.error('You must select a build.');
        process.exit(1);
      }
    }

    const build = await appBuildsService.findOne({ appId, appBuildId: buildId });
    await printJobFailureSummary({ jobId: build.jobId });
  }),
});
