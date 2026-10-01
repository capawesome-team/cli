import appsService from '@/services/apps.js';
import { withAuth } from '@/utils/auth.js';
import { clearableValue } from '@/utils/cli-options.js';
import { isInteractive } from '@/utils/environment.js';
import { promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import consola from 'consola';
import { z } from 'zod';
import { defineCommand, defineOptions } from 'zodline';

export default defineCommand({
  description: 'Update an existing app.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      channel: z
        .string()
        .optional()
        .describe('The name of the default channel for live updates. Pass an empty string to clear it.'),
      channelDiscovery: z
        .union([z.boolean(), z.stringbool()], {
          message: 'Channel discovery must be either `true` or `false`.',
        })
        .optional()
        .describe('Enable or disable channel discovery. Supported values are `true` and `false`.'),
      configuration: z
        .string()
        .optional()
        .describe('The name of the default native configuration. Pass an empty string to clear it.'),
      environment: z
        .string()
        .optional()
        .describe('The name of the default environment. Pass an empty string to clear it.'),
      json: z.boolean().optional().describe('Output in JSON format.'),
      name: z.string().optional().describe('Name of the app.'),
      nextBuildNumber: z.coerce
        .number()
        .int()
        .optional()
        .describe('The next build number. Must be greater than the latest build number.'),
      stack: z
        .union([z.enum(['macos-sequoia', 'macos-tahoe', 'macos-golden-gate']), z.literal('')], {
          message: 'Build stack must be one of `macos-sequoia`, `macos-tahoe`, or `macos-golden-gate`.',
        })
        .optional()
        .describe(
          'The default build stack for builds without an explicit build stack. Must be one of `macos-sequoia`, `macos-tahoe`, or `macos-golden-gate`. Pass an empty string to use the Capawesome Cloud default.',
        ),
      type: z
        .enum(['android', 'capacitor', 'cordova', 'ios'], {
          message: 'Type must be one of `android`, `capacitor`, `cordova`, or `ios`.',
        })
        .optional()
        .describe('Type of the app. Supported values are `android`, `capacitor`, `cordova`, and `ios`.'),
    }),
  ),
  action: withAuth(async (options, args) => {
    let { appId, json } = options;

    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizationId = await promptOrganizationSelection();
      appId = await promptAppSelection(organizationId);
    }

    const app = await appsService.update({
      appChannelDiscoveryEnabled: options.channelDiscovery,
      appChannelName: clearableValue(options.channel),
      appConfigurationName: clearableValue(options.configuration),
      appEnvironmentName: clearableValue(options.environment),
      appId,
      buildStack: clearableValue(options.stack),
      name: options.name,
      nextAppBuildNumber: options.nextBuildNumber,
      type: options.type,
    });
    if (json) {
      console.log(JSON.stringify(app, null, 2));
    } else {
      consola.success('App updated successfully.');
    }
  }),
});
