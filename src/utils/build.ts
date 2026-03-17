import appBuildsService from '@/services/app-builds.js';
import { AppBuildDto } from '@/types/app-build.js';
import { unescapeAnsi } from '@/utils/ansi.js';
import { wait } from '@/utils/wait.js';
import consola from 'consola';

export const waitForBuildCompletion = async (options: {
  appId: string;
  appBuildId: string;
  relations?: string;
}): Promise<AppBuildDto> => {
  const { appId, appBuildId, relations = 'job,job.jobLogs' } = options;

  let lastPrintedLogNumber = 0;
  let isWaitingForStart = true;

  while (true) {
    try {
      const build = await appBuildsService.findOne({
        appId,
        appBuildId,
        relations,
      });

      if (!build.job) {
        await wait(3000);
        continue;
      }

      const jobStatus = build.job.status;

      if (jobStatus === 'queued' || jobStatus === 'pending') {
        if (isWaitingForStart) {
          consola.start(`Waiting for build to start (status: ${jobStatus})...`);
        }
        await wait(3000);
        continue;
      }

      if (isWaitingForStart && jobStatus === 'in_progress') {
        isWaitingForStart = false;
        consola.success('Build started...');
      }

      if (build.job.jobLogs && build.job.jobLogs.length > 0) {
        const newLogs = build.job.jobLogs
          .filter((log) => log.number > lastPrintedLogNumber)
          .sort((a, b) => a.number - b.number);

        for (const log of newLogs) {
          console.log(unescapeAnsi(log.payload));
          lastPrintedLogNumber = log.number;
        }
      }

      if (
        jobStatus === 'succeeded' ||
        jobStatus === 'failed' ||
        jobStatus === 'canceled' ||
        jobStatus === 'rejected' ||
        jobStatus === 'timed_out'
      ) {
        console.log();
        if (jobStatus === 'succeeded') {
          return build;
        } else if (jobStatus === 'failed') {
          consola.error('Build failed.');
          process.exit(1);
        } else if (jobStatus === 'canceled') {
          consola.warn('Build was canceled.');
          process.exit(1);
        } else if (jobStatus === 'rejected') {
          consola.error('Build was rejected.');
          process.exit(1);
        } else if (jobStatus === 'timed_out') {
          consola.error('Build timed out.');
          process.exit(1);
        }
      }

      await wait(3000);
    } catch (error) {
      consola.error('Error polling build status:', error);
      process.exit(1);
    }
  }
};
