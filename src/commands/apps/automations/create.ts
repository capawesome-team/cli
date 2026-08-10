import appAutomationsService from '@/services/app-automations.js';
import appsService from '@/services/apps.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import consola from 'consola';
import { z } from 'zod';
import { defineCommand, defineOptions } from 'zodline';

export default defineCommand({
  description: 'Create a new app automation.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      certificate: z.string().optional().describe('The name of the certificate to use for the build.'),
      channel: z.string().optional().describe('The name of the channel to deploy to (Web only).'),
      commitMessagePattern: z
        .string()
        .optional()
        .describe('Only trigger for commits whose message matches this pattern (branch triggers only).'),
      configuration: z.string().optional().describe('The name of the native configuration (Android/iOS only).'),
      destination: z.string().optional().describe('The name of the destination to deploy to (Android/iOS only).'),
      environment: z.string().optional().describe('The name of the environment to use for the build.'),
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
        .describe('Only trigger for branches or tags matching this pattern. Defaults to all.'),
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
    let { appId, json, name, platform, triggerType } = options;

    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizationId = await promptOrganizationSelection();
      appId = await promptAppSelection(organizationId);
    }

    if (!name) {
      if (!isInteractive()) {
        consola.error('You must provide the automation name when running in non-interactive environment.');
        process.exit(1);
      }
      name = await prompt('Enter the name of the automation:', { type: 'text' });
      if (!name) {
        consola.error('You must provide an automation name.');
        process.exit(1);
      }
    }

    if (!triggerType) {
      if (!isInteractive()) {
        consola.error('You must provide the trigger type when running in non-interactive environment.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      triggerType = await prompt('Select what triggers the automation:', {
        type: 'select',
        options: [
          { label: 'Branch', value: 'branch' },
          { label: 'Tag', value: 'tag' },
        ],
      });
      if (!triggerType) {
        consola.error('You must select a trigger type.');
        process.exit(1);
      }
    }

    // Derive platform from app type for single-platform apps
    if (!platform) {
      const app = await appsService.findOne({ appId });
      if (app.type === 'android' || app.type === 'ios') {
        platform = app.type;
      }
    }

    if (!platform) {
      if (!isInteractive()) {
        consola.error('You must provide a platform when running in non-interactive environment.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      platform = await prompt('Select the platform for the build:', {
        type: 'select',
        options: [
          { label: 'Android', value: 'android' },
          { label: 'iOS', value: 'ios' },
          { label: 'Web', value: 'web' },
        ],
      });
      if (!platform) {
        consola.error('You must select a platform.');
        process.exit(1);
      }
    }

    const automation = await appAutomationsService.create({
      appCertificateName: options.certificate,
      appChannelName: options.channel,
      appConfigurationName: options.configuration,
      appDestinationName: options.destination,
      appEnvironmentName: options.environment,
      appId,
      buildStack: options.stack,
      buildType: options.type,
      commitMessagePattern: options.commitMessagePattern,
      name,
      platform,
      triggerPattern: options.triggerPattern,
      triggerType,
    });
    if (json) {
      console.log(JSON.stringify({ id: automation.id }, null, 2));
    } else {
      consola.info(`Automation ID: ${automation.id}`);
      consola.success('Automation created successfully.');
    }
  }),
});
