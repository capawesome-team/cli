import versionService from '@/services/mutate/version.js';
import { versionToString } from '@/utils/version.js';
import { defineCommand } from '@robingenz/zli';
import consola from 'consola';

export default defineCommand({
  description: 'Get the version of the app from all relevant files',
  action: async () => {
    try {
      const versions = await versionService.getAllVersions();

      if (versions.length === 0) {
        consola.error('No platform versions found');
        process.exit(1);
      }

      const firstVersion = versions[0]!.version;
      const allInSync = versions.every((pv) => {
        return (
          pv.version.major === firstVersion.major &&
          pv.version.minor === firstVersion.minor &&
          pv.version.patch === firstVersion.patch &&
          pv.version.hotfix === firstVersion.hotfix
        );
      });

      if (!allInSync) {
        consola.error('Versions are not synchronized across platforms:');
        versions.forEach((pv) => {
          const versionStr = versionToString(pv.version);
          const hotfixStr = pv.version.hotfix > 0 ? ` (hotfix: ${pv.version.hotfix})` : '';
          consola.log(`  ${pv.platform}: ${versionStr}${hotfixStr} (${pv.source})`);
        });
        process.exit(1);
      }

      const versionStr = versionToString(firstVersion);
      const hotfixStr = firstVersion.hotfix > 0 ? ` (hotfix: ${firstVersion.hotfix})` : '';
      consola.success(`Version: ${versionStr}${hotfixStr}`);

      versions.forEach((pv) => {
        consola.log(`  ${pv.platform}: ${pv.source}`);
      });
    } catch (error) {
      consola.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  },
});
