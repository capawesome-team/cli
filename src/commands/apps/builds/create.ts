import { DEFAULT_CONSOLE_BASE_URL } from '@/config/consts.js';
import appBuildsService from '@/services/app-builds.js';
import appsService from '@/services/apps.js';
import authorizationService from '@/services/authorization-service.js';
import organizationsService from '@/services/organizations.js';
import { prompt } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { hasTTY } from 'std-env';
import { z } from 'zod';

const IOS_BUILD_TYPES = ['simulator', 'development', 'ad-hoc', 'app-store', 'enterprise'] as const;
const ANDROID_BUILD_TYPES = ['debug', 'release'] as const;

export default defineCommand({
  description: 'Create a new app build.',
  options: defineOptions(
    z.object({
      appId: z
        .uuid({
          message: 'App ID must be a UUID.',
        })
        .optional()
        .describe('App ID to create the build for.'),
      platform: z
        .enum(['ios', 'android'], {
          message: 'Platform must be either `ios` or `android`.',
        })
        .optional()
        .describe('The platform for the build. Supported values are `ios` and `android`.'),
      type: z
        .string()
        .optional()
        .describe(
          'The type of build. For iOS, supported values are `simulator`, `development`, `ad-hoc`, `app-store`, and `enterprise`. For Android, supported values are `debug` and `release`.',
        ),
      gitRef: z.string().optional().describe('The Git reference (branch, tag, or commit SHA) to build.'),
      environment: z.string().optional().describe('The name of the environment to use for the build.'),
      certificate: z.string().optional().describe('The name of the certificate to use for the build.'),
    }),
  ),
  action: async (options) => {
    let { appId, platform, type, gitRef, environment, certificate } = options;

    // Check if the user is logged in
    if (!authorizationService.hasAuthorizationToken()) {
      consola.error('You must be logged in to run this command.');
      process.exit(1);
    }

    // Prompt for app ID if not provided
    if (!appId) {
      if (!hasTTY) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizations = await organizationsService.findAll();
      if (organizations.length === 0) {
        consola.error('You must create an organization before creating a build.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      const organizationId = await prompt('Select the organization of the app for which you want to create a build.', {
        type: 'select',
        options: organizations.map((organization) => ({ label: organization.name, value: organization.id })),
      });
      if (!organizationId) {
        consola.error('You must select the organization of an app for which you want to create a build.');
        process.exit(1);
      }
      const apps = await appsService.findAll({
        organizationId,
      });
      if (apps.length === 0) {
        consola.error('You must create an app before creating a build.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      appId = await prompt('Which app do you want to create a build for:', {
        type: 'select',
        options: apps.map((app) => ({ label: app.name, value: app.id })),
      });
      if (!appId) {
        consola.error('You must select an app to create a build for.');
        process.exit(1);
      }
    }

    // Prompt for platform if not provided
    if (!platform) {
      if (!hasTTY) {
        consola.error('You must provide a platform when running in non-interactive environment.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      platform = await prompt('Select the platform for the build:', {
        type: 'select',
        options: [
          { label: 'iOS', value: 'ios' },
          { label: 'Android', value: 'android' },
        ],
      });
      if (!platform) {
        consola.error('You must select a platform.');
        process.exit(1);
      }
    }

    // Prompt for git ref if not provided
    if (!gitRef) {
      if (!hasTTY) {
        consola.error('You must provide a git ref when running in non-interactive environment.');
        process.exit(1);
      }
      gitRef = await prompt('Enter the Git reference (branch, tag, or commit SHA):', {
        type: 'text',
      });
      if (!gitRef) {
        consola.error('You must provide a git ref.');
        process.exit(1);
      }
    }

    // Set default type based on platform if not provided
    if (!type) {
      type = platform === 'android' ? 'debug' : 'simulator';
    }

    // Validate type based on platform
    if (platform === 'ios' && !IOS_BUILD_TYPES.includes(type as any)) {
      consola.error(
        `Invalid build type for iOS. Supported values are: ${IOS_BUILD_TYPES.map((t) => `\`${t}\``).join(', ')}.`,
      );
      process.exit(1);
    }
    if (platform === 'android' && !ANDROID_BUILD_TYPES.includes(type as any)) {
      consola.error(
        `Invalid build type for Android. Supported values are: ${ANDROID_BUILD_TYPES.map((t) => `\`${t}\``).join(', ')}.`,
      );
      process.exit(1);
    }

    // Create the app build
    consola.start('Creating build...');
    const response = await appBuildsService.create({
      appCertificateName: certificate,
      appEnvironmentName: environment,
      appId,
      gitRef,
      platform,
      type,
    });
    consola.success('Build successfully created.');
    consola.info(`Build Number: ${response.number}`);
    consola.info(`Build ID: ${response.id}`);
    consola.info(`Build URL: ${DEFAULT_CONSOLE_BASE_URL}/apps/${appId}/builds/${response.id}`);
  },
});
