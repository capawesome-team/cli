import appAutomationsService from '@/services/app-automations.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'List all automations for an app.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      json: z.boolean().optional().describe('Output in JSON format.'),
      limit: z.coerce.number().optional().describe('Limit for pagination.'),
      offset: z.coerce.number().optional().describe('Offset for pagination.'),
      platform: z
        .enum(['android', 'ios', 'web'], {
          message: 'Platform must be either `android`, `ios`, or `web`.',
        })
        .optional()
        .describe('Only list automations for this platform.'),
    }),
  ),
  action: withAuth(async (options, args) => {
    let { appId, json, limit, offset, platform } = options;

    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizationId = await promptOrganizationSelection();
      appId = await promptAppSelection(organizationId);
    }

    const automations = await appAutomationsService.findAll({
      appId,
      limit,
      offset,
      platform,
    });

    if (json) {
      console.log(JSON.stringify(automations, null, 2));
    } else {
      console.table(automations);
      consola.success('Automations retrieved successfully.');
    }
  }),
});
