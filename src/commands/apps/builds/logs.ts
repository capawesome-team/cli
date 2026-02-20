import appBuildsService from '@/services/app-builds.js';
import { unescapeAnsi } from '@/utils/ansi.js';
import { withAuth } from '@/utils/auth.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import { wait } from '@/utils/wait.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { isInteractive } from '@/utils/environment.js';
import { z } from 'zod';

export default defineCommand({
  description: 'Show logs of an app build.',
  options: defineOptions(
    z.object({
      appId: z
        .uuid({
          message: 'App ID must be a UUID.',
        })
        .optional()
        .describe('App ID to display the build logs for.'),
      buildId: z
        .uuid({
          message: 'Build ID must be a UUID.',
        })
        .optional()
        .describe('Build ID to display the build logs for.'),
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

    // Prompt for platform if not provided
    if (!buildId) {
      if (!isInteractive()) {
        consola.error('You must provide a platform when running in non-interactive environment.');
        process.exit(1);
      }
      const appBuilds = await appBuildsService.findAll({ appId });
      if (appBuilds.length === 0) {
        consola.error('You must create a build before viewing the logs.');
        process.exit(1);
      }
      buildId = await prompt('Select the build of the app for which you want to view the logs.', {
        type: 'select',
        options: appBuilds.map((build) => ({
          label: `Build #${build.numberAsString} (${build.platform} - ${build.type})`,
          value: build.id,
        })),
      });
      if (!buildId) {
        consola.error('You must select the build of an app for which you want to view the logs.');
        process.exit(1);
      }
    }

    let appBuildDto = await appBuildsService.findOne({ appId, appBuildId: buildId!, relations: 'job,job.jobLogs' });
    let isFinished = !!appBuildDto.job?.finishedAt;
    let lastLogNumber = 0;

    if (isFinished) {
      const logs = appBuildDto.job?.jobLogs || [];
      for (const logEntry of logs) {
        console.log(unescapeAnsi(logEntry.payload));
      }
    } else {
      while (!isFinished) {
        appBuildDto = await appBuildsService.findOne({ appId, appBuildId: buildId!, relations: 'job,job.jobLogs' });
        isFinished = !!appBuildDto.job?.finishedAt;
        const logs = appBuildDto.job?.jobLogs || [];

        const newLogs = logs.filter((log) => log.number > lastLogNumber);
        for (const logEntry of newLogs) {
          console.log(unescapeAnsi(logEntry.payload));
          lastLogNumber = logEntry.number;
        }

        if (!isFinished) {
          await wait(3000);
        }
      }
    }
  }),
});
