import { DEFAULT_CONSOLE_BASE_URL } from '@/config/consts.js';
import appsService from '@/services/apps.js';
import gitConnectionsService from '@/services/git-connections.js';
import { GitConnectionDto } from '@/types/git-connection.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { getGitConnectionHost, getGitRemoteInfo } from '@/utils/git.js';
import {
  prompt,
  promptAppSelection,
  promptGitConnectionSelection,
  promptOrganizationSelection,
  promptRepositorySelection,
} from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

const findGitConnectionsForApp = async (organizationId: string, appId: string): Promise<GitConnectionDto[]> => {
  const [appGitConnections, organizationGitConnections] = await Promise.all([
    gitConnectionsService.findAll({ organizationId, appId, limit: 50 }),
    gitConnectionsService.findAll({ organizationId, scope: 'organization', limit: 50 }),
  ]);
  return [...appGitConnections, ...organizationGitConnections];
};

export default defineCommand({
  description: 'Connect a git repository to an app.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      gitConnection: z.string().optional().describe('Name of the git connection to use.'),
      gitConnectionId: z.string().optional().describe('ID of the git connection to use.'),
      path: z
        .string()
        .optional()
        .describe('Path of the repository (e.g. `owner/repo`) or the clone URL for `git_http` connections.'),
    }),
  ),
  action: withAuth(async (options, args) => {
    let { appId, gitConnectionId, path } = options;
    const gitConnectionName = options.gitConnection;

    if (gitConnectionId && gitConnectionName) {
      consola.error('The --git-connection-id and --git-connection options cannot be used together.');
      process.exit(1);
    }

    let organizationId: string;
    if (appId) {
      const app = await appsService.findOne({ appId });
      organizationId = app.organizationId;
    } else {
      if (!isInteractive()) {
        consola.error('You must provide the app ID when running in non-interactive environment.');
        process.exit(1);
      }
      organizationId = await promptOrganizationSelection();
      appId = await promptAppSelection(organizationId);
    }

    if (gitConnectionName) {
      const gitConnections = await gitConnectionsService.findAll({ organizationId, name: gitConnectionName });
      const gitConnection = gitConnections[0];
      if (!gitConnection) {
        consola.error(`No git connection found with name "${gitConnectionName}".`);
        process.exit(1);
      }
      gitConnectionId = gitConnection.id;
    }

    if (gitConnectionId) {
      path = path ?? getGitRemoteInfo()?.path;
      if (!path) {
        consola.error('You must provide the repository path using the --path option.');
        process.exit(1);
      }
      await appsService.linkRepository({ appId, gitConnectionId, path });
      consola.success('Repository connected successfully.');
      return;
    }

    if (!isInteractive()) {
      consola.error(
        'You must provide the git connection using the --git-connection-id or --git-connection option when running in non-interactive environment.',
      );
      process.exit(1);
    }

    const gitConnections = await findGitConnectionsForApp(organizationId, appId);
    if (gitConnections.length === 0) {
      consola.error(
        `No git connections found. Please create one in the Capawesome Cloud Console (${DEFAULT_CONSOLE_BASE_URL}).`,
      );
      process.exit(1);
    }

    const gitRemoteInfo = getGitRemoteInfo();
    if (gitRemoteInfo && !path) {
      const matches = gitConnections.filter(
        (gitConnection) => getGitConnectionHost(gitConnection) === gitRemoteInfo.host,
      );
      const match = matches[0];
      if (matches.length === 1 && match) {
        const confirmed = await prompt(
          `Do you want to connect \`${gitRemoteInfo.path}\` using the git connection "${match.name}"?`,
          { type: 'confirm', initial: true },
        );
        if (confirmed) {
          await appsService.linkRepository({ appId, gitConnectionId: match.id, path: gitRemoteInfo.path });
          consola.success('Repository connected successfully.');
          return;
        }
      }
    }

    const gitConnection = await promptGitConnectionSelection(gitConnections);
    if (!path) {
      if (gitConnection.provider === 'git_http') {
        path = await prompt('Enter the clone URL of the repository:', { type: 'text' });
      } else {
        path = await promptRepositorySelection(gitConnection);
      }
    }
    await appsService.linkRepository({ appId, gitConnectionId: gitConnection.id, path });
    consola.success('Repository connected successfully.');
  }),
});
