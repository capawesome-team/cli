import versionService from '@/services/mutate/version.js';
import { parseVersion, versionToString } from '@/utils/version.js';
import { defineCommand } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Set the version of the app in all relevant files',
  args: z.tuple([z.string().describe('Version')]),
  action: async (_options, args) => {
    try {
      const version = parseVersion(args[0]);

      consola.info(`Setting version to ${versionToString(version)}...`);

      await versionService.setVersion(version);

      consola.success(`Version set to ${versionToString(version)}`);
    } catch (error) {
      consola.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  },
});
