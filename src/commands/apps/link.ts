import { DEFAULT_CONSOLE_BASE_URL } from '@/config/consts.js';
import appsService from '@/services/apps.js';
import gitConnectionsService from '@/services/git-connections.js';
import { GitConnectionResolutionDto } from '@/types/git-connection.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { getGitRemoteUrl } from '@/utils/git.js';
import {
  prompt,
  promptAppSelection,
  promptGitConnectionSelection,
  promptOrganizationSelection,
  promptRepositorySelection,
} from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import { AxiosError } from 'axios';
import consola from 'consola';
import { z } from 'zod';

const resolveGitRemote = async (organizationId: string): Promise<GitConnectionResolutionDto | undefined> => {
  const remoteUrl = getGitRemoteUrl();
  if (!remoteUrl) {
    return undefined;
  }
  try {
    return await gitConnectionsService.resolve({ organizationId, remoteUrl });
  } catch (error) {
    if (error instanceof AxiosError && error.response?.status === 400) {
      return undefined;
    }
    throw error;
  }
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
      path = path ?? (await resolveGitRemote(organizationId))?.path;
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

    if (!path) {
      const resolution = await resolveGitRemote(organizationId);
      if (resolution) {
        const gitConnections = resolution.gitConnections;
        const gitConnection = gitConnections[0];
        if (gitConnections.length === 1 && gitConnection) {
          const confirmed = await prompt(
            `Do you want to connect \`${resolution.path}\` using the git connection "${gitConnection.name}"?`,
            { type: 'confirm', initial: true },
          );
          if (confirmed) {
            await appsService.linkRepository({ appId, gitConnectionId: gitConnection.id, path: resolution.path });
            consola.success('Repository connected successfully.');
            return;
          }
        } else if (gitConnections.length > 1) {
          const selectedGitConnection = await promptGitConnectionSelection(gitConnections);
          await appsService.linkRepository({ appId, gitConnectionId: selectedGitConnection.id, path: resolution.path });
          consola.success('Repository connected successfully.');
          return;
        } else if (resolution.provider) {
          consola.error(
            `No git connection found for the git remote \`origin\`. Please create a ${resolution.provider} connection in the Capawesome Cloud Console (${DEFAULT_CONSOLE_BASE_URL}).`,
          );
          process.exit(1);
        } else {
          consola.error('No git connection can serve the git remote `origin`.');
          process.exit(1);
        }
      }
    }

    const gitConnections = await gitConnectionsService.findAll({ organizationId, restricted: false, limit: 50 });
    if (gitConnections.length === 0) {
      consola.error(
        `No git connections found. Please create one in the Capawesome Cloud Console (${DEFAULT_CONSOLE_BASE_URL}).`,
      );
      process.exit(1);
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
