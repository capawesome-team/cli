import { createFingerprint } from '@/utils/fingerprint/index.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import pathModule from 'path';
import { z } from 'zod';

export default defineCommand({
  description: '[Experimental] Generate a fingerprint of the native runtime for an Android or iOS build.',
  options: defineOptions(
    z.object({
      platform: z.enum(['android', 'ios']).describe('The native platform to generate the fingerprint for.'),
      path: z.string().optional().default('.').describe('Path to the project root directory. Defaults to `.`.'),
      json: z.boolean().optional().default(false).describe('Output the full fingerprint as JSON.'),
    }),
  ),
  action: async (options, _args) => {
    const { platform, path, json } = options;

    consola.warn('This command is experimental and may change in the future.');

    const projectRoot = pathModule.resolve(process.cwd(), path);
    const fingerprint = await createFingerprint({ projectRoot, platform });

    if (json) {
      console.log(JSON.stringify(fingerprint, null, 2));
    } else {
      consola.log(`App Type: ${fingerprint.appType}`);
      consola.log(`Platform: ${fingerprint.platform}`);
      consola.log(`Sources:  ${fingerprint.sources.length}`);
      consola.log(`Hash:     ${fingerprint.hash}`);
      consola.success('Fingerprint generated successfully.');
    }
  },
});
