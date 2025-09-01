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

      const versionStr = versionToString(currentVersion);
      const currentHotfix = currentVersion.hotfix || 0;
      const newHotfix = newVersion.hotfix || 0;

      consola.info(`Incrementing hotfix for version ${versionStr} (${currentHotfix} -> ${newHotfix})...`);

      await versionService.setVersion(newVersion);

      consola.success(`Hotfix incremented for version ${versionStr} (now ${newHotfix})`);
    } catch (error) {
      consola.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  },
});
