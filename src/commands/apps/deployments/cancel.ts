import appDeploymentsService from '@/services/app-deployments.js';
import appsService from '@/services/apps.js';
import authorizationService from '@/services/authorization-service.js';
import jobsService from '@/services/jobs.js';
import organizationsService from '@/services/organizations.js';
import { prompt } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { isInteractive } from '@/utils/environment.js';
import { z } from 'zod';

export default defineCommand({
  description: 'Cancel an ongoing app deployment.',
  options: defineOptions(
    z.object({
      appId: z
        .uuid({
          message: 'App ID must be a UUID.',
        })
        .optional()
        .describe('App ID the deployment belongs to.'),
      deploymentId: z
        .uuid({
          message: 'Deployment ID must be a UUID.',
        })
        .optional()
        .describe('Deployment ID to cancel.'),
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
        consola.error('You must create an organization before canceling a deployment.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      const organizationId = await prompt(
        'Select the organization of the app for which you want to cancel a deployment.',
        {
          type: 'select',
          options: organizations.map((organization) => ({ label: organization.name, value: organization.id })),
        },
      );
      if (!organizationId) {
        consola.error('You must select the organization of an app for which you want to cancel a deployment.');
        process.exit(1);
      }
      const apps = await appsService.findAll({
        organizationId,
      });
      if (apps.length === 0) {
        consola.error('You must create an app before canceling a deployment.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      appId = await prompt('Which app do you want to cancel a deployment for:', {
        type: 'select',
        options: apps.map((app) => ({ label: app.name, value: app.id })),
      });
      if (!appId) {
        consola.error('You must select an app to cancel a deployment for.');
        process.exit(1);
      }
    }

    // Prompt for deployment ID if not provided
    if (!deploymentId) {
      if (!isInteractive()) {
        consola.error('You must provide a deployment ID when running in non-interactive environment.');
        process.exit(1);
      }
      const deployments = await appDeploymentsService.findAll({ appId });
      if (deployments.length === 0) {
        consola.error('No deployments found for this app.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      deploymentId = await prompt('Which deployment do you want to cancel:', {
        type: 'select',
        options: deployments.map((deployment) => ({
          label: `Deployment ${deployment.id}`,
          value: deployment.id,
        })),
      });
      if (!deploymentId) {
        consola.error('You must select a deployment to cancel.');
        process.exit(1);
      }
    }

    // Get deployment details to retrieve the job ID
    consola.start('Fetching deployment details...');
    const deployment = await appDeploymentsService.findOne({
      appId,
      appDeploymentId: deploymentId,
    });

    // Cancel the job
    consola.start('Canceling deployment...');
    await jobsService.update({
      jobId: deployment.jobId,
      dto: {
        status: 'canceled',
      },
    });
    consola.success('Deployment successfully canceled.');
  },
});
