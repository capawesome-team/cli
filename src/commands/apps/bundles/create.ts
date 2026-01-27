import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Create a new app bundle.',
  options: defineOptions(
    z.object({
      androidMax: z.coerce
        .string()
        .optional()
        .describe('The maximum Android version code (`versionCode`) that the bundle supports.'),
      androidMin: z.coerce
        .string()
        .optional()
        .describe('The minimum Android version code (`versionCode`) that the bundle supports.'),
      androidEq: z.coerce
        .string()
        .optional()
        .describe('The exact Android version code (`versionCode`) that the bundle does not support.'),
      appId: z
        .string({
          message: 'App ID must be a UUID.',
        })
        .uuid({
          message: 'App ID must be a UUID.',
        })
        .optional()
        .describe('App ID to deploy to.'),
      artifactType: z
        .enum(['manifest', 'zip'], {
          message: 'Invalid artifact type. Must be either `manifest` or `zip`.',
        })
        .optional()
        .describe('The type of artifact to deploy. Must be either `manifest` or `zip`. The default is `zip`.')
        .default('zip'),
      channel: z.string().optional().describe('Channel to associate the bundle with.'),
      commitMessage: z.string().optional().describe('The commit message related to the bundle.'),
      commitRef: z.string().optional().describe('The commit ref related to the bundle.'),
      commitSha: z.string().optional().describe('The commit sha related to the bundle.'),
      customProperty: z
        .array(z.string().min(1).max(100))
        .optional()
        .describe(
          'A custom property to assign to the bundle. Must be in the format `key=value`. Can be specified multiple times.',
        ),
      expiresInDays: z.coerce
        .number({
          message: 'Expiration days must be an integer.',
        })
        .int({
          message: 'Expiration days must be an integer.',
        })
        .optional()
        .describe('The number of days until the bundle is automatically deleted.'),
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
        .describe('The exact iOS bundle version (`CFBundleVersion`) that the bundle does not support.'),
      path: z
        .string()
        .optional()
        .describe('Path to the bundle to upload. Must be a folder (e.g. `www` or `dist`) or a zip file.'),
      privateKey: z
        .string()
        .optional()
        .describe(
          'The private key to sign the bundle with. Can be a file path to a .pem file or the private key content as plain text.',
        ),
      rollout: z.coerce
        .number()
        .min(0)
        .max(1, {
          message: 'Rollout percentage must be a number between 0 and 1 (e.g. 0.5).',
        })
        .optional()
        .default(1)
        .describe('The percentage of devices to deploy the bundle to. Must be a number between 0 and 1 (e.g. 0.5).'),
      url: z.string().optional().describe('The url to the self-hosted bundle file.'),
    }),
  ),
  action: async (options, args) => {
    consola.warn('The `apps:bundles:create` command has been deprecated.');
    consola.info('Please use one of the following commands instead:');
    consola.info('  - `apps:liveupdates:upload` to upload a bundle to Capawesome Cloud');
    consola.info('  - `apps:liveupdates:register` to register a self-hosted bundle URL');
    process.exit(1);
  },
});
