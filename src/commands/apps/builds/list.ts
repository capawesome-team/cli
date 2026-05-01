import appBuildsService from '@/services/app-builds.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Retrieve a list of existing app builds.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      json: z.boolean().optional().describe('Output in JSON format.'),
      limit: z.coerce.number().optional().describe('Limit for pagination.'),
      numberAsString: z.string().optional().describe('Build number to filter by.'),
      offset: z.coerce.number().optional().describe('Offset for pagination.'),
      platform: z.enum(['android', 'ios', 'web']).optional().describe('Platform to filter by.'),
    }),
  ),
  action: withAuth(async (options, args) => {
    let { appId, json, limit, numberAsString, offset, platform } = options;

    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizationId = await promptOrganizationSelection();
      appId = await promptAppSelection(organizationId);
    }

    const foundBuilds = await appBuildsService.findAll({
      appId,
      limit,
      numberAsString,
      offset,
      platform,
      relations: json ? 'job' : undefined,
    });
    if (json) {
      console.log(JSON.stringify(foundBuilds, null, 2));
    } else {
      console.table(foundBuilds);
      consola.success('Builds retrieved successfully.');
    }
  }),
});
