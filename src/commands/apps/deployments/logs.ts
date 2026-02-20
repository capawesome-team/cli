import appDeploymentsService from '@/services/app-deployments.js';
import { unescapeAnsi } from '@/utils/ansi.js';
import { withAuth } from '@/utils/auth.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import { wait } from '@/utils/wait.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { isInteractive } from '@/utils/environment.js';
import { z } from 'zod';

export default defineCommand({
  description: 'View the deployment logs of an app.',
  options: defineOptions(
    z.object({
      appId: z
        .uuid({
          message: 'App ID must be a UUID.',
        })
        .optional()
        .describe('App ID to view the deployment logs for.'),
      deploymentId: z
        .uuid({
          message: 'Deployment ID must be a UUID.',
        })
        .optional()
        .describe('Deployment ID to view logs.'),
    }),
  ),
  action: withAuth(async (options) => {
    let { appId, deploymentId } = options;

    // Prompt for app ID if not provided
    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizationId = await promptOrganizationSelection();
      appId = await promptAppSelection(organizationId);
    }

    // Prompt for deployment ID if not provided
    if (!deploymentId) {
      if (!isInteractive()) {
        consola.error('You must provide a deployment ID when running in non-interactive environment.');
        process.exit(1);
      }
      const appDeployments = await appDeploymentsService.findAll({ appId });
      if (appDeployments.length === 0) {
        consola.error('There are no deployments for this app.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      deploymentId = await prompt('Which deployment do you want to view the logs for?', {
        type: 'select',
        options: appDeployments.map((deployment) => ({
          label: `Deployment ${deployment.id}`,
          value: deployment.id,
        })),
      });
      if (!deploymentId) {
        consola.error('You must select a deployment to view the logs.');
        process.exit(1);
      }
    }

    let appDeploymentDto = await appDeploymentsService.findOne({
      appId,
      appDeploymentId: deploymentId,
      relations: 'job,job.jobLogs',
    });
    let isFinished = !!appDeploymentDto.job?.finishedAt;
    let lastLogNumber = 0;

    if (isFinished) {
      const logs = appDeploymentDto.job?.jobLogs || [];
      for (const logEntry of logs) {
        console.log(unescapeAnsi(logEntry.payload));
      }
    } else {
      while (!isFinished) {
        appDeploymentDto = await appDeploymentsService.findOne({
          appId,
          appDeploymentId: deploymentId,
          relations: 'job,job.jobLogs',
        });
        isFinished = !!appDeploymentDto.job?.finishedAt;
        const logs = appDeploymentDto.job?.jobLogs || [];

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
