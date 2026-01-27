import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Delete an app bundle.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      bundleId: z.string().optional().describe('ID of the bundle.'),
    }),
  ),
  action: async (options, args) => {
    consola.warn('The `apps:bundles:delete` command has been deprecated and will be removed in future versions.');
    consola.info('Please refer to the official documentation for alternative approaches.');
    process.exit(1);
  },
});
