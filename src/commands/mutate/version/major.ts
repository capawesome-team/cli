import versionService from '@/services/mutate/version.js';
import { incrementMajor, versionToString } from '@/utils/version.js';
import { defineCommand } from '@robingenz/zli';
import consola from 'consola';

export default defineCommand({
  description: 'Increment the major version of the app in all relevant files',
  action: async () => {
    try {
      const currentVersion = await versionService.ensureVersionsInSync();
      const newVersion = incrementMajor(currentVersion);

      consola.info(
        `Incrementing major version from ${versionToString(currentVersion)} to ${versionToString(newVersion)}...`,
      );

      await versionService.setVersion(newVersion);

      consola.success(`Major version incremented to ${versionToString(newVersion)}`);
    } catch (error) {
      consola.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  },
});
