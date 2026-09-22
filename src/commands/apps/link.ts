import { DEFAULT_CONSOLE_BASE_URL } from '@/config/consts.js';
import appsService from '@/services/apps.js';
import gitConnectionsService from '@/services/git-connections.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { getGitRemoteInfo, getGitRepositoryPath } from '@/utils/git.js';
import { promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import consola from 'consola';
import { z } from 'zod';
import { defineCommand, defineOptions } from 'zodline';

export default defineCommand({
  description: 'Connect a git repository to an app.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      gitConnectionId: z
        .string()
        .optional()
        .describe(
          'ID of the git connection to use. Defaults to the first git connection of the organization for the git provider of the repository.',
        ),
    }),
  ),
  action: withAuth(async (options, args) => {
    let { appId, gitConnectionId } = options;

    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide the app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizationId = await promptOrganizationSelection();
      appId = await promptAppSelection(organizationId);
    }
    const gitRemoteInfo = getGitRemoteInfo();
    if (!gitConnectionId) {
      const app = await appsService.findOne({ appId });
      const [gitConnection] = await gitConnectionsService.findAll({
        organizationId: app.organizationId,
        provider: gitRemoteInfo.provider,
        restricted: false,
        limit: 1,
      });
      if (!gitConnection) {
        consola.error(
          `No \`${gitRemoteInfo.provider}\` git connection found in the organization. Connect the git provider first at ${DEFAULT_CONSOLE_BASE_URL}/organizations/${app.organizationId}/git.`,
        );
        process.exit(1);
      }
      gitConnectionId = gitConnection.id;
    }
    await appsService.linkRepository({
      appId,
      gitConnectionId,
      path: getGitRepositoryPath(gitRemoteInfo),
    });
    consola.success('Repository connected successfully.');
  }),
});
