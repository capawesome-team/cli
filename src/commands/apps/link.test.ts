import { DEFAULT_API_BASE_URL } from '@/config/consts.js';
import authorizationService from '@/services/authorization-service.js';
import { GitConnectionDto } from '@/types/git-connection.js';
import { isInteractive } from '@/utils/environment.js';
import { getGitRemoteInfo } from '@/utils/git.js';
import {
  prompt,
  promptAppSelection,
  promptGitConnectionSelection,
  promptOrganizationSelection,
} from '@/utils/prompt.js';
import userConfig from '@/utils/user-config.js';
import consola from 'consola';
import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import linkCommand from './link.js';

vi.mock('@/utils/user-config.js');
vi.mock('@/utils/prompt.js');
vi.mock('@/services/authorization-service.js');
vi.mock('consola');
vi.mock('@/utils/environment.js', () => ({
  isInteractive: vi.fn(() => true),
}));
vi.mock('@/utils/git.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/git.js')>();
  return {
    ...actual,
    getGitRemoteInfo: vi.fn(() => ({
      host: 'github.com',
      path: 'capawesome-team/cli',
    })),
  };
});

describe('apps-link', () => {
  const appId = 'app-123';
  const orgId = 'org-1';
  const testToken = 'test-token';
  const gitConnection: GitConnectionDto = {
    id: 'gc-1',
    appId: null,
    authKind: 'oauth',
    baseUrl: null,
    name: 'My Connection',
    organizationId: orgId,
    provider: 'github',
  };

  const mockUserConfig = vi.mocked(userConfig);
  const mockIsInteractive = vi.mocked(isInteractive);
  const mockGetGitRemoteInfo = vi.mocked(getGitRemoteInfo);
  const mockPrompt = vi.mocked(prompt);
  const mockPromptOrganizationSelection = vi.mocked(promptOrganizationSelection);
  const mockPromptAppSelection = vi.mocked(promptAppSelection);
  const mockPromptGitConnectionSelection = vi.mocked(promptGitConnectionSelection);
  const mockConsola = vi.mocked(consola);
  const mockAuthorizationService = vi.mocked(authorizationService);

  const nockAppRequest = () =>
    nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, { id: appId, name: 'Test App', organizationId: orgId });

  beforeEach(() => {
    vi.clearAllMocks();

    mockUserConfig.read.mockReturnValue({ token: 'test-token' });
    mockAuthorizationService.getCurrentAuthorizationToken.mockReturnValue('test-token');
    mockAuthorizationService.hasAuthorizationToken.mockReturnValue(true);
    mockIsInteractive.mockReturnValue(true);

    vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
      throw new Error(`Process exited with code ${code}`);
    });
  });

  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
  });

  it('should link repository with provided git connection ID and path', async () => {
    const appScope = nockAppRequest();
    const scope = nock(DEFAULT_API_BASE_URL)
      .put(`/v1/apps/${appId}/repository`, {
        gitConnectionId: gitConnection.id,
        path: 'capawesome-team/cli',
      })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, { id: appId, name: 'Test App' });

    await linkCommand.action({ appId, gitConnectionId: gitConnection.id, path: 'capawesome-team/cli' }, undefined);

    expect(appScope.isDone()).toBe(true);
    expect(scope.isDone()).toBe(true);
    expect(mockConsola.success).toHaveBeenCalledWith('Repository connected successfully.');
  });

  it('should link repository with git remote path when path is not provided', async () => {
    const appScope = nockAppRequest();
    const scope = nock(DEFAULT_API_BASE_URL)
      .put(`/v1/apps/${appId}/repository`, {
        gitConnectionId: gitConnection.id,
        path: 'capawesome-team/cli',
      })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, { id: appId, name: 'Test App' });

    await linkCommand.action({ appId, gitConnectionId: gitConnection.id }, undefined);

    expect(appScope.isDone()).toBe(true);
    expect(scope.isDone()).toBe(true);
    expect(mockConsola.success).toHaveBeenCalledWith('Repository connected successfully.');
  });

  it('should resolve git connection by name', async () => {
    const appScope = nockAppRequest();
    const connectionsScope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/organizations/${orgId}/git-connections`)
      .query({ name: gitConnection.name })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, [gitConnection]);
    const scope = nock(DEFAULT_API_BASE_URL)
      .put(`/v1/apps/${appId}/repository`, {
        gitConnectionId: gitConnection.id,
        path: 'capawesome-team/cli',
      })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, { id: appId, name: 'Test App' });

    await linkCommand.action({ appId, gitConnection: gitConnection.name, path: 'capawesome-team/cli' }, undefined);

    expect(appScope.isDone()).toBe(true);
    expect(connectionsScope.isDone()).toBe(true);
    expect(scope.isDone()).toBe(true);
    expect(mockConsola.success).toHaveBeenCalledWith('Repository connected successfully.');
  });

  it('should error when git connection name is not found', async () => {
    const appScope = nockAppRequest();
    const connectionsScope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/organizations/${orgId}/git-connections`)
      .query({ name: 'Unknown' })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, []);

    await expect(linkCommand.action({ appId, gitConnection: 'Unknown' }, undefined)).rejects.toThrow();

    expect(appScope.isDone()).toBe(true);
    expect(connectionsScope.isDone()).toBe(true);
    expect(mockConsola.error).toHaveBeenCalledWith('No git connection found with name "Unknown".');
  });

  it('should error when both git connection ID and name are provided', async () => {
    await expect(
      linkCommand.action({ appId, gitConnectionId: gitConnection.id, gitConnection: gitConnection.name }, undefined),
    ).rejects.toThrow();

    expect(mockConsola.error).toHaveBeenCalledWith(
      'The --git-connection-id and --git-connection options cannot be used together.',
    );
  });

  it('should error when no git connection is provided in non-interactive environment', async () => {
    mockIsInteractive.mockReturnValue(false);
    const appScope = nockAppRequest();

    await expect(linkCommand.action({ appId }, undefined)).rejects.toThrow();

    expect(appScope.isDone()).toBe(true);
    expect(mockConsola.error).toHaveBeenCalledWith(
      'You must provide the git connection using the --git-connection-id or --git-connection option when running in non-interactive environment.',
    );
  });

  it('should link repository after confirming the matching git connection', async () => {
    mockPromptOrganizationSelection.mockResolvedValueOnce(orgId);
    mockPromptAppSelection.mockResolvedValueOnce(appId);
    mockPrompt.mockResolvedValueOnce(true as never);

    const appConnectionsScope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/organizations/${orgId}/git-connections`)
      .query({ appId, limit: '50' })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, []);
    const organizationConnectionsScope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/organizations/${orgId}/git-connections`)
      .query({ scope: 'organization', limit: '50' })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, [gitConnection]);
    const scope = nock(DEFAULT_API_BASE_URL)
      .put(`/v1/apps/${appId}/repository`, {
        gitConnectionId: gitConnection.id,
        path: 'capawesome-team/cli',
      })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, { id: appId, name: 'Test App' });

    await linkCommand.action({}, undefined);

    expect(appConnectionsScope.isDone()).toBe(true);
    expect(organizationConnectionsScope.isDone()).toBe(true);
    expect(scope.isDone()).toBe(true);
    expect(mockPromptOrganizationSelection).toHaveBeenCalled();
    expect(mockPromptAppSelection).toHaveBeenCalledWith(orgId);
    expect(mockConsola.success).toHaveBeenCalledWith('Repository connected successfully.');
  });

  it('should fall back to git connection selection when no connection matches the git remote', async () => {
    mockGetGitRemoteInfo.mockReturnValue(undefined);
    mockPromptGitConnectionSelection.mockResolvedValueOnce(gitConnection);

    const appScope = nockAppRequest();
    const appConnectionsScope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/organizations/${orgId}/git-connections`)
      .query({ appId, limit: '50' })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, []);
    const organizationConnectionsScope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/organizations/${orgId}/git-connections`)
      .query({ scope: 'organization', limit: '50' })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, [gitConnection]);
    const scope = nock(DEFAULT_API_BASE_URL)
      .put(`/v1/apps/${appId}/repository`, {
        gitConnectionId: gitConnection.id,
        path: 'capawesome-team/cli',
      })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, { id: appId, name: 'Test App' });

    await linkCommand.action({ appId, path: 'capawesome-team/cli' }, undefined);

    expect(appScope.isDone()).toBe(true);
    expect(appConnectionsScope.isDone()).toBe(true);
    expect(organizationConnectionsScope.isDone()).toBe(true);
    expect(scope.isDone()).toBe(true);
    expect(mockPromptGitConnectionSelection).toHaveBeenCalledWith([gitConnection]);
    expect(mockConsola.success).toHaveBeenCalledWith('Repository connected successfully.');
  });

  it('should error when no git connections are found', async () => {
    const appScope = nockAppRequest();
    const appConnectionsScope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/organizations/${orgId}/git-connections`)
      .query({ appId, limit: '50' })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, []);
    const organizationConnectionsScope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/organizations/${orgId}/git-connections`)
      .query({ scope: 'organization', limit: '50' })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, []);

    await expect(linkCommand.action({ appId }, undefined)).rejects.toThrow();

    expect(appScope.isDone()).toBe(true);
    expect(appConnectionsScope.isDone()).toBe(true);
    expect(organizationConnectionsScope.isDone()).toBe(true);
    expect(mockConsola.error).toHaveBeenCalled();
  });

  it('should handle API error', async () => {
    const appScope = nockAppRequest();
    const scope = nock(DEFAULT_API_BASE_URL)
      .put(`/v1/apps/${appId}/repository`, {
        gitConnectionId: gitConnection.id,
        path: 'capawesome-team/cli',
      })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(404, { message: 'Git connection not found.' });

    await expect(
      linkCommand.action({ appId, gitConnectionId: gitConnection.id, path: 'capawesome-team/cli' }, undefined),
    ).rejects.toThrow();

    expect(appScope.isDone()).toBe(true);
    expect(scope.isDone()).toBe(true);
  });
});
