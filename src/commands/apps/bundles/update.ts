import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Update an app bundle.',
  options: defineOptions(
    z.object({
      androidMax: z
        .string()
        .optional()
        .describe('The maximum Android version code (`versionCode`) that the bundle supports.'),
      androidMin: z
        .string()
        .optional()
        .describe('The minimum Android version code (`versionCode`) that the bundle supports.'),
      androidEq: z
        .string()
        .optional()
        .describe('The exact Android version code (`versionCode`) that the bundle should not support.'),
      appId: z.string().optional().describe('ID of the app.'),
      bundleId: z.string().optional().describe('ID of the bundle.'),
      rollout: z.coerce
        .number()
        .min(0)
        .max(1, {
          message: 'Rollout percentage must be a number between 0 and 1 (e.g. 0.5).',
        })
        .optional()
        .describe('The percentage of devices to deploy the bundle to. Must be a number between 0 and 1 (e.g. 0.5).'),
      iosMax: z
        .string()
        .optional()
        .describe('The maximum iOS bundle version (`CFBundleVersion`) that the bundle supports.'),
      iosMin: z
        .string()
        .optional()
        .describe('The minimum iOS bundle version (`CFBundleVersion`) that the bundle supports.'),
      iosEq: z
        .string()
        .optional()
        .describe('The exact iOS bundle version (`CFBundleVersion`) that the bundle should not support.'),
    }),
  ),
  action: async (options, args) => {
    consola.warn('The `apps:bundles:update` command has been deprecated and will be removed in future versions.');
    consola.info('Please refer to the official documentation for alternative approaches.');
    process.exit(0);
  },
});
