import appAutomationsService from '@/services/app-automations.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import consola from 'consola';
import { z } from 'zod';
import { defineCommand, defineOptions } from 'zodline';

export default defineCommand({
  description: 'Delete an app automation.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      automationId: z.string().optional().describe('ID of the automation. Either the ID or name must be provided.'),
      name: z.string().optional().describe('Name of the automation. Either the ID or name must be provided.'),
      yes: z.boolean().optional().describe('Skip confirmation prompt.'),
    }),
    { y: 'yes' },
  ),
  action: withAuth(async (options, args) => {
    let { appId, automationId, name } = options;

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
      automationId = await prompt('Select the automation to delete:', {
        type: 'select',
        options: automations.map((automation) => ({ label: automation.name, value: automation.id })),
      });
    }

    if (!automationId && name) {
      const automations = await appAutomationsService.findAll({ appId, name });
      const automation = automations[0];
      if (!automation) {
        consola.error(`No automation found with name '${name}'.`);
        process.exit(1);
      }
      automationId = automation.id;
    }
    if (!automationId) {
      consola.error('Automation not found.');
      process.exit(1);
    }

    if (!options.yes && isInteractive()) {
      const confirmed = await prompt('Are you sure you want to delete this automation?', {
        type: 'confirm',
      });
      if (!confirmed) {
        return;
      }
    }

    await appAutomationsService.delete({ appId, automationId });
    consola.success('Automation deleted successfully.');
  }),
});
