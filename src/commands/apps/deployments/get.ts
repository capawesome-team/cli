import appDeploymentsService from '@/services/app-deployments.js';
import { withAuth } from '@/utils/auth.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Get an existing app deployment.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      deploymentId: z.string().optional().describe('ID of the deployment.'),
      json: z.boolean().optional().describe('Output in JSON format.'),
    }),
  ),
  action: withAuth(async (options, args) => {
    const { appId, deploymentId, json } = options;

    if (!appId) {
      consola.error('You must provide an app ID.');
      process.exit(1);
    }
    if (!deploymentId) {
      consola.error('You must provide a deployment ID.');
      process.exit(1);
    }

    const deployment = await appDeploymentsService.findOne({
      appId,
      appDeploymentId: deploymentId,
      relations: json ? 'job' : undefined,
    });
    if (json) {
      console.log(JSON.stringify(deployment, null, 2));
    } else {
      console.table(deployment);
      consola.success('Deployment retrieved successfully.');
    }
  }),
});
