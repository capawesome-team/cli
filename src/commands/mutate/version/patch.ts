import versionService from '@/services/mutate/version.js';
import { incrementPatch, versionToString } from '@/utils/version.js';
import { defineCommand } from '@robingenz/zli';
import consola from 'consola';

export default defineCommand({
  description: 'Increment the patch version of the app in all relevant files',
  action: async () => {
    try {
      const currentVersion = await versionService.ensureVersionsInSync();
      const newVersion = incrementPatch(currentVersion);

      consola.info(
        `Incrementing patch version from ${versionToString(currentVersion)} to ${versionToString(newVersion)}...`,
      );

      await versionService.setVersion(newVersion);

      consola.success(`Patch version incremented to ${versionToString(newVersion)}`);
    } catch (error) {
      consola.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  },
});
