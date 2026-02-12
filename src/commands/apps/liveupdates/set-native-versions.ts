import appBuildsService from '@/services/app-builds.js';
import authorizationService from '@/services/authorization-service.js';
import { isInteractive } from '@/utils/environment.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Set native version constraints on a web build.',
  options: defineOptions(
    z.object({
      appId: z
        .string({
          message: 'App ID must be a UUID.',
        })
        .uuid({
          message: 'App ID must be a UUID.',
        })
        .optional()
        .describe('The app ID of the build.'),
      buildId: z
        .string({
          message: 'Build ID must be a UUID.',
        })
        .uuid({
          message: 'Build ID must be a UUID.',
        })
        .optional()
        .describe('The build ID to update.'),
      androidEq: z.coerce
        .string()
        .optional()
        .describe('The exact Android version code (`versionCode`) that the build supports.'),
      androidMax: z.coerce
        .string()
        .optional()
        .describe('The maximum Android version code (`versionCode`) that the build supports.'),
      androidMin: z.coerce
        .string()
        .optional()
        .describe('The minimum Android version code (`versionCode`) that the build supports.'),
      iosEq: z
        .string()
        .optional()
        .describe('The exact iOS bundle version (`CFBundleVersion`) that the build supports.'),
      iosMax: z
        .string()
        .optional()
        .describe('The maximum iOS bundle version (`CFBundleVersion`) that the build supports.'),
      iosMin: z
        .string()
        .optional()
        .describe('The minimum iOS bundle version (`CFBundleVersion`) that the build supports.'),
    }),
  ),
  action: async (options) => {
    const { appId, buildId, androidEq, androidMax, androidMin, iosEq, iosMax, iosMin } = options;

    if (!authorizationService.hasAuthorizationToken()) {
      consola.error('You must be logged in to run this command. Please run the `login` command first.');
      process.exit(1);
    }

    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      consola.error('You must provide an app ID with the `--app-id` flag.');
      process.exit(1);
    }

    if (!buildId) {
      if (!isInteractive()) {
        consola.error('You must provide a build ID when running in non-interactive environment.');
        process.exit(1);
      }
      consola.error('You must provide a build ID with the `--build-id` flag.');
      process.exit(1);
    }

    consola.start('Setting native version constraints...');
    await appBuildsService.update({
      appId,
      appBuildId: buildId,
      eqAndroidAppVersionCode: androidEq,
      maxAndroidAppVersionCode: androidMax,
      minAndroidAppVersionCode: androidMin,
      eqIosAppVersionCode: iosEq,
      maxIosAppVersionCode: iosMax,
      minIosAppVersionCode: iosMin,
    });

    consola.success('Native version constraints set successfully.');
  },
});
