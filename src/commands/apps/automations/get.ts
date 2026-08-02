import appAutomationsService from '@/services/app-automations.js';
import { AppAutomationDto } from '@/types/app-automation.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Get an existing app automation.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      automationId: z.string().optional().describe('ID of the automation. Either the ID or name must be provided.'),
      json: z.boolean().optional().describe('Output in JSON format.'),
      name: z.string().optional().describe('Name of the automation. Either the ID or name must be provided.'),
    }),
  ),
  action: withAuth(async (options, args) => {
    let { appId, automationId, json, name } = options;

    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizationId = await promptOrganizationSelection();
      appId = await promptAppSelection(organizationId);
    }

    if (!automationId && !name) {
      if (!isInteractive()) {
        consola.error('You must provide either the automation ID or name when running in non-interactive environment.');
        process.exit(1);
      }
      const automations = await appAutomationsService.findAll({ appId });
      if (!automations.length) {
        consola.error('No automations found for this app. Create one first.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      automationId = await prompt('Select the automation:', {
        type: 'select',
        options: automations.map((automation) => ({ label: automation.name, value: automation.id })),
      });
    }

    let automation: AppAutomationDto | undefined;
    if (automationId) {
      automation = await appAutomationsService.findOneById({ appId, automationId });
    } else if (name) {
      const automations = await appAutomationsService.findAll({ appId, name });
      automation = automations[0];
    }
    if (!automation) {
      consola.error('Automation not found.');
      process.exit(1);
    }

    if (json) {
      console.log(JSON.stringify(automation, null, 2));
    } else {
      console.table(automation);
      consola.success('Automation retrieved successfully.');
    }
  }),
});
