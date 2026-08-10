import appAutomationsService from '@/services/app-automations.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import consola from 'consola';
import { z } from 'zod';
import { defineCommand, defineOptions } from 'zodline';

const clearableValue = (value: string | undefined): string | null | undefined => (value === '' ? null : value);

export default defineCommand({
  description: 'Update an existing app automation.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      automationId: z.string().optional().describe('ID of the automation.'),
      certificate: z
        .string()
        .optional()
        .describe('The name of the certificate to use for the build. Pass an empty string to clear it.'),
      channel: z
        .string()
        .optional()
        .describe('The name of the channel to deploy to (Web only). Pass an empty string to clear it.'),
      commitMessagePattern: z
        .string()
        .optional()
        .describe(
          'Only trigger for commits whose message matches this pattern (branch triggers only). Pass an empty string to clear it.',
        ),
      configuration: z
        .string()
        .optional()
        .describe('The name of the native configuration (Android/iOS only). Pass an empty string to clear it.'),
      destination: z
        .string()
        .optional()
        .describe('The name of the destination to deploy to (Android/iOS only). Pass an empty string to clear it.'),
      environment: z
        .string()
        .optional()
        .describe('The name of the environment to use for the build. Pass an empty string to clear it.'),
      json: z.boolean().optional().describe('Output in JSON format.'),
      name: z.string().optional().describe('Name of the automation.'),
      platform: z
        .enum(['android', 'ios', 'web'], {
          message: 'Platform must be either `android`, `ios`, or `web`.',
        })
        .optional()
        .describe('The platform for the build. Supported values are `android`, `ios`, and `web`.'),
      stack: z
        .enum(['macos-sequoia', 'macos-tahoe'], {
          message: 'Build stack must be either `macos-sequoia` or `macos-tahoe`.',
        })
        .optional()
        .describe('The build stack to use for the build process.'),
      triggerPattern: z
        .string()
        .optional()
        .describe('Only trigger for branches or tags matching this pattern. Pass an empty string to clear it.'),
      triggerType: z
        .enum(['branch', 'tag'], {
          message: 'Trigger type must be either `branch` or `tag`.',
        })
        .optional()
        .describe('What triggers the automation. Supported values are `branch` and `tag`.'),
      type: z
        .enum(['app-store', 'ad-hoc', 'debug', 'development', 'enterprise', 'release', 'simulator'], {
          message:
            'Build type must be one of `app-store`, `ad-hoc`, `debug`, `development`, `enterprise`, `release`, or `simulator`.',
        })
        .optional()
        .describe('The type of build to create.'),
    }),
  ),
  action: withAuth(async (options, args) => {
    let { appId, automationId, json } = options;

    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizationId = await promptOrganizationSelection();
      appId = await promptAppSelection(organizationId);
    }

    if (!automationId) {
      if (!isInteractive()) {
        consola.error('You must provide the automation ID when running in non-interactive environment.');
        process.exit(1);
      }
      const automations = await appAutomationsService.findAll({ appId });
      if (!automations.length) {
        consola.error('No automations found for this app. Create one first.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      automationId = await prompt('Select the automation to update:', {
        type: 'select',
        options: automations.map((automation) => ({ label: automation.name, value: automation.id })),
      });
    }

    await appAutomationsService.update({
      appCertificateName: clearableValue(options.certificate),
      appChannelName: clearableValue(options.channel),
      appConfigurationName: clearableValue(options.configuration),
      appDestinationName: clearableValue(options.destination),
      appEnvironmentName: clearableValue(options.environment),
      appId,
      automationId,
      buildStack: options.stack,
      buildType: options.type,
      commitMessagePattern: clearableValue(options.commitMessagePattern),
      name: options.name,
      platform: options.platform,
      triggerPattern: clearableValue(options.triggerPattern),
      triggerType: options.triggerType,
    });
    if (json) {
      console.log(JSON.stringify({ id: automationId }, null, 2));
    } else {
      consola.success('Automation updated successfully.');
    }
  }),
});
