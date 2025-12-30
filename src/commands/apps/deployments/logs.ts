import appDeploymentsService from '@/services/app-deployments.js';
import appsService from '@/services/apps.js';
import authorizationService from '@/services/authorization-service.js';
import organizationsService from '@/services/organizations.js';
import { unescapeAnsi } from '@/utils/ansi.js';
import { prompt } from '@/utils/prompt.js';
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
  action: async (options) => {
    let { appId, deploymentId } = options;

    // Check if the user is logged in
    if (!authorizationService.hasAuthorizationToken()) {
      consola.error('You must be logged in to run this command. Please run the `login` command first.');
      process.exit(1);
    }

    // Prompt for app ID if not provided
    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizations = await organizationsService.findAll();
      if (organizations.length === 0) {
        consola.error('You must create an organization before viewing deployment logs.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      const organizationId = await prompt(
        'Select the organization that contains the app whose deployment logs you want to view?',
        {
          type: 'select',
          options: organizations.map((organization) => ({ label: organization.name, value: organization.id })),
        },
      );
      if (!organizationId) {
        consola.error('You must select the organization containing the app whose deployment logs you want to view.');
        process.exit(1);
      }
      const apps = await appsService.findAll({
        organizationId,
      });
      if (apps.length === 0) {
        consola.error('You must create an app before viewing deployment logs.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      appId = await prompt('Which app do you want to view deployment logs for?', {
        type: 'select',
        options: apps.map((app) => ({ label: app.name, value: app.id })),
      });
      if (!appId) {
        consola.error('You must select an app to view its deployment logs.');
        process.exit(1);
      }
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
  },
});
