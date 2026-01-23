import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Generate a manifest file.',
  options: defineOptions(
    z.object({
      path: z.string().optional().describe('Path to the web assets folder (e.g. `www` or `dist`).'),
    }),
  ),
  action: async (options: any, args: any) => {
    consola.warn(
      'The `manifests:generate` command has been deprecated. Please use `apps:liveupdates:generatemanifest` instead.',
    );
    process.exit(0);
  },
});
