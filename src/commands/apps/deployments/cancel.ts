import appDeploymentsService from '@/services/app-deployments.js';
import jobsService from '@/services/jobs.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
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
  }),
});
