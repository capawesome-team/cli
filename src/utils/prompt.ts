import { GitConnectionDto } from '@/types/git-connection.js';
import consola from 'consola';

export const prompt: typeof consola.prompt = async (message, options) => {
  options = { ...(options || {}), cancel: 'symbol' } as any;
  const response = await consola.prompt(message, options);
  // See https://github.com/unjs/consola/pull/325#issue-2751614453
  if (response === Symbol.for('cancel')) {
    process.exit(0);
  }
  return response;
};

export const promptOrganizationSelection = async (options?: {
  allowCreate?: boolean;
  message?: string;
}): Promise<string> => {
  const organizationsService = await import('@/services/organizations.js').then((mod) => mod.default);
  let organizations = await organizationsService.findAll();
  if (organizations.length === 0) {
    if (options?.allowCreate) {
      const shouldCreate = await prompt('No organizations found. Do you want to create one now?', {
        type: 'confirm',
        initial: true,
      });
      if (shouldCreate) {
        await (await import('@/commands/organizations/create.js').then((mod) => mod.default)).action({}, undefined);
        organizations = await organizationsService.findAll();
      } else {
        process.exit(1);
      }
    } else {
      consola.error('No organizations found. Please create one first.');
      process.exit(1);
    }
  }
  // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
  const organizationId = await prompt(options?.message ?? 'Which organization do you want to use?', {
    type: 'select',
    options: organizations.map((organization) => ({ label: organization.name, value: organization.id })),
  });
  return organizationId;
};

export const promptAppSelection = async (
  organizationId: string,
  options?: { allowCreate?: boolean },
): Promise<string> => {
  const appsService = await import('@/services/apps.js').then((mod) => mod.default);
  let apps = await appsService.findAll({ organizationId, limit: 50 });
  if (apps.length === 0) {
    if (options?.allowCreate) {
      const shouldCreate = await prompt('No apps found. Do you want to create one now?', {
        type: 'confirm',
        initial: true,
      });
      if (shouldCreate) {
        await (
          await import('@/commands/apps/create.js').then((mod) => mod.default)
        ).action({ organizationId }, undefined);
        apps = await appsService.findAll({ organizationId });
      } else {
        process.exit(1);
      }
    } else {
      consola.error('No apps found. Please create one first.');
      process.exit(1);
    }
  }
  // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
  const appId = await prompt('Which app do you want to use?', {
    type: 'select',
    options: apps.map((app) => ({ label: app.name, value: app.id })),
  });
  return appId;
};

export const promptGitConnectionSelection = async (gitConnections: GitConnectionDto[]): Promise<GitConnectionDto> => {
  // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
  const gitConnectionId = await prompt('Which git connection do you want to use?', {
    type: 'select',
    options: gitConnections.map((gitConnection) => ({
      label: `${gitConnection.name} (${gitConnection.provider})`,
      value: gitConnection.id,
    })),
  });
  const gitConnection = gitConnections.find((gitConnection) => gitConnection.id === gitConnectionId);
  if (!gitConnection) {
    consola.error('Git connection not found.');
    process.exit(1);
  }
  return gitConnection;
};

export const promptRepositorySelection = async (gitConnection: GitConnectionDto): Promise<string> => {
  const gitConnectionsService = await import('@/services/git-connections.js').then((mod) => mod.default);
  let namespace: string | undefined;
  let query: string | undefined;
  if (gitConnection.provider === 'bitbucket') {
    namespace = await prompt('Enter the Bitbucket workspace slug:', { type: 'text' });
  } else if (gitConnection.provider === 'azure_devops') {
    namespace = await prompt('Enter the Azure DevOps organization and project (e.g. `my-org/my-project`):', {
      type: 'text',
    });
  } else {
    const search = await prompt('Search for a repository (optional):', { type: 'text' });
    query = search.trim() || undefined;
  }
  const repositories = await gitConnectionsService.findAllRepositories({
    gitConnectionId: gitConnection.id,
    organizationId: gitConnection.organizationId,
    namespace,
    query,
  });
  if (repositories.length === 0) {
    consola.error('No repositories found.');
    process.exit(1);
  }
  // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
  const path = await prompt('Which repository do you want to connect?', {
    type: 'select',
    options: repositories.map((repository) => ({ label: repository.path, value: repository.path })),
  });
  return path;
};
