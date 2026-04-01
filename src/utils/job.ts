import jobsService from '@/services/jobs.js';
import { JobDto } from '@/types/job.js';
import { unescapeAnsi } from '@/utils/ansi.js';
import { wait } from '@/utils/wait.js';
import consola from 'consola';

const getLabel = (job: JobDto): string => {
  if (job.appBuildId) {
    return 'build';
  }
  if (job.appDeploymentId) {
    return 'deployment';
  }
  return 'job';
};

const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

export const waitForJobCompletion = async (options: { jobId: string }): Promise<JobDto> => {
  const { jobId } = options;

  let lastPrintedLogNumber = 0;
  let isWaitingForStart = true;

  while (true) {
    try {
      const job = await jobsService.findOne({ jobId, relations: 'jobLogs' });
      const label = getLabel(job);
      const jobStatus = job.status;

      if (jobStatus === 'queued' || jobStatus === 'pending') {
        if (isWaitingForStart) {
          consola.start(`Waiting for ${label} to start (status: ${jobStatus})...`);
        }
        await wait(3000);
        continue;
      }

      if (isWaitingForStart && jobStatus === 'in_progress') {
        isWaitingForStart = false;
        consola.success(`${capitalize(label)} started...`);
      }

      if (job.jobLogs && job.jobLogs.length > 0) {
        const newLogs = job.jobLogs
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
          return job;
        } else if (jobStatus === 'failed') {
          consola.error(`${capitalize(label)} failed.`);
          process.exit(1);
        } else if (jobStatus === 'canceled') {
          consola.error(`${capitalize(label)} was canceled.`);
          process.exit(1);
        } else if (jobStatus === 'rejected') {
          consola.error(`${capitalize(label)} was rejected.`);
          process.exit(1);
        } else if (jobStatus === 'timed_out') {
          consola.error(`${capitalize(label)} timed out.`);
          process.exit(1);
        }
      }

      await wait(3000);
    } catch (error) {
      consola.error('Error polling job status:', error);
      process.exit(1);
    }
  }
};
