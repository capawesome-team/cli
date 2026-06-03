import appDeploymentsService from '@/services/app-deployments.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { printJobFailureSummary } from '@/utils/job-failure-summary.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Explain why an app deployment failed using Capawesome Cloud Assist (AI).',
  options: defineOptions(
    z.object({
      appId: z
        .uuid({
          message: 'App ID must be a UUID.',
        })
        .optional()
        .describe('App ID of the deployment to summarize.'),
      deploymentId: z
        .uuid({
          message: 'Deployment ID must be a UUID.',
        })
        .optional()
        .describe('Deployment ID to summarize.'),
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
      deploymentId = await prompt('Which deployment do you want a failure summary for?', {
        type: 'select',
        options: appDeployments.map((deployment) => ({
          label: `Deployment ${deployment.id}`,
          value: deployment.id,
        })),
      });
      if (!deploymentId) {
        consola.error('You must select a deployment.');
        process.exit(1);
      }
    }

    const deployment = await appDeploymentsService.findOne({ appId, appDeploymentId: deploymentId });
    await printJobFailureSummary({ jobId: deployment.jobId });
  }),
});
