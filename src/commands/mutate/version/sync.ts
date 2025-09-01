import versionService from '@/services/mutate/version.js';
import { versionToString } from '@/utils/version.js';
import { defineCommand } from '@robingenz/zli';
import consola from 'consola';

export default defineCommand({
  description: 'Set the highest version number among all platforms in all relevant files',
  action: async () => {
    try {
      const versions = await versionService.getAllVersions();

      if (versions.length === 0) {
        consola.error('No platform versions found');
        process.exit(1);
      }

      const highestVersion = await versionService.getHighestVersion();

      consola.info('Current versions:');
      versions.forEach((pv) => {
        const versionStr = versionToString(pv.version);
        consola.log(`  ${pv.platform}: ${versionStr}`);
      });

      const highestVersionStr = versionToString(highestVersion);

      consola.info(`Syncing all platforms to highest version: ${highestVersionStr}...`);

      await versionService.setVersion(highestVersion);

      consola.success(`All platforms synced to version ${highestVersionStr}`);
    } catch (error) {
      consola.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  },
});
