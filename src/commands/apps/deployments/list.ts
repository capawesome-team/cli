import appDeploymentsService from '@/services/app-deployments.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Retrieve a list of existing app deployments.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      buildId: z.string().optional().describe('ID of the build to filter by.'),
      channelId: z.string().optional().describe('ID of the channel to filter by.'),
      destinationId: z.string().optional().describe('ID of the destination to filter by.'),
      json: z.boolean().optional().describe('Output in JSON format.'),
      limit: z.coerce.number().optional().describe('Limit for pagination.'),
      offset: z.coerce.number().optional().describe('Offset for pagination.'),
    }),
  ),
  action: withAuth(async (options, args) => {
    let { appId, buildId, channelId, destinationId, json, limit, offset } = options;

    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizationId = await promptOrganizationSelection();
      appId = await promptAppSelection(organizationId);
    }

    const foundDeployments = await appDeploymentsService.findAll({
      appId,
      appBuildId: buildId,
      appChannelId: channelId,
      appDestinationId: destinationId,
      limit,
      offset,
      relations: json ? 'job' : undefined,
    });
    if (json) {
      console.log(JSON.stringify(foundDeployments, null, 2));
    } else {
      console.table(foundDeployments);
      consola.success('Deployments retrieved successfully.');
    }
  }),
});
