import appsService from '@/services/apps.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { getGitRemoteInfo } from '@/utils/git.js';
import { promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Connect a git repository to an app.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
    }),
  ),
  action: withAuth(async (options, args) => {
    let { appId } = options;

    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide the app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizationId = await promptOrganizationSelection();
      appId = await promptAppSelection(organizationId);
    }
    const gitRemoteInfo = getGitRemoteInfo();
    await appsService.linkRepository({
      appId,
      ownerSlug: gitRemoteInfo.ownerSlug,
      provider: gitRemoteInfo.provider,
      repositorySlug: gitRemoteInfo.repositorySlug,
      projectSlug: gitRemoteInfo.projectSlug,
    });
    consola.success('Repository connected successfully.');
  }),
});
