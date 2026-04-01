import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Delete an app bundle. Deprecated.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      bundleId: z.string().optional().describe('ID of the bundle.'),
    }),
  ),
  action: async (options, args) => {
    consola.warn('The `apps:bundles:delete` command has been deprecated. Please use the `apps:liveupdates` commands instead.');
    process.exit(1);
  },
});
