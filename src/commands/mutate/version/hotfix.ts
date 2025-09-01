import versionService from '@/services/mutate/version.js';
import { incrementHotfix, versionToString } from '@/utils/version.js';
import { defineCommand } from '@robingenz/zli';
import consola from 'consola';

export default defineCommand({
  description: 'Increment the hotfix version of the app in all relevant files',
  action: async () => {
    try {
      const currentVersion = await versionService.ensureVersionsInSync();
      const newVersion = incrementHotfix(currentVersion);

      const currentVersionStr = versionToString(currentVersion);
      const newVersionStr = versionToString(newVersion);
      const hotfixInfo = `(hotfix: ${currentVersion.hotfix} -> ${newVersion.hotfix})`;

      consola.info(`Incrementing hotfix version from ${currentVersionStr} to ${newVersionStr} ${hotfixInfo}...`);

      await versionService.setVersion(newVersion);

      consola.success(`Hotfix version incremented to ${newVersionStr} (hotfix: ${newVersion.hotfix})`);
    } catch (error) {
      consola.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  },
});
