import { DEFAULT_API_BASE_URL } from '@/config/consts.js';
import authorizationService from '@/services/authorization-service.js';
import { promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
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
  isInteractive: () => true,
}));
vi.mock('@/utils/git.js', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/git.js')>()),
  getGitRemoteInfo: () => ({
    ownerSlug: 'capawesome-team',
    provider: 'github',
    repositorySlug: 'cli',
  }),
}));

describe('apps-link', () => {
  const mockUserConfig = vi.mocked(userConfig);
  const mockPromptOrganizationSelection = vi.mocked(promptOrganizationSelection);
  const mockPromptAppSelection = vi.mocked(promptAppSelection);
  const mockConsola = vi.mocked(consola);
  const mockAuthorizationService = vi.mocked(authorizationService);
  const appId = 'app-123';
  const organizationId = 'org-1';
  const testToken = 'test-token';

  beforeEach(() => {
    vi.clearAllMocks();

    mockUserConfig.read.mockReturnValue({ token: testToken });
    mockAuthorizationService.getCurrentAuthorizationToken.mockReturnValue(testToken);
    mockAuthorizationService.hasAuthorizationToken.mockReturnValue(true);

    vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
      throw new Error(`Process exited with code ${code}`);
    });
  });

  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
  });

  const mockGitConnectionLookup = (gitConnections: { id: string }[]) =>
    nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}`)
      .reply(200, { id: appId, name: 'Test App', organizationId, type: 'capacitor' })
      .get(`/v1/organizations/${organizationId}/git-connections`)
      .query({ provider: 'github', restricted: 'false', limit: 1 })
      .reply(200, gitConnections);

  it('should link repository using the git connection of the organization', async () => {
    const scope = mockGitConnectionLookup([{ id: 'git-connection-1' }])
      .put(`/v1/apps/${appId}/repository`, { gitConnectionId: 'git-connection-1', path: 'capawesome-team/cli' })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, { id: appId, name: 'Test App' });

    await linkCommand.action({ appId }, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockConsola.success).toHaveBeenCalledWith('Repository connected successfully.');
  });

  it('should link repository using the provided git connection ID', async () => {
    const scope = nock(DEFAULT_API_BASE_URL)
      .put(`/v1/apps/${appId}/repository`, { gitConnectionId: 'git-connection-2', path: 'capawesome-team/cli' })
      .reply(200, { id: appId, name: 'Test App' });

    await linkCommand.action({ appId, gitConnectionId: 'git-connection-2' }, undefined);

    expect(scope.isDone()).toBe(true);
  });

  it('should prompt for organization and app when app ID is not provided', async () => {
    mockPromptOrganizationSelection.mockResolvedValueOnce(organizationId);
    mockPromptAppSelection.mockResolvedValueOnce(appId);
    const scope = mockGitConnectionLookup([{ id: 'git-connection-1' }])
      .put(`/v1/apps/${appId}/repository`, { gitConnectionId: 'git-connection-1', path: 'capawesome-team/cli' })
      .reply(200, { id: appId, name: 'Test App' });

    await linkCommand.action({}, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockPromptOrganizationSelection).toHaveBeenCalled();
    expect(mockPromptAppSelection).toHaveBeenCalledWith(organizationId);
  });

  it('should error if the organization has no git connection for the provider', async () => {
    const scope = mockGitConnectionLookup([]);

    await expect(linkCommand.action({ appId }, undefined)).rejects.toThrow('Process exited with code 1');

    expect(scope.isDone()).toBe(true);
    expect(mockConsola.error).toHaveBeenCalledWith(expect.stringContaining('No `github` git connection found'));
  });

  it('should handle API error', async () => {
    const scope = mockGitConnectionLookup([{ id: 'git-connection-1' }])
      .put(`/v1/apps/${appId}/repository`, { gitConnectionId: 'git-connection-1', path: 'capawesome-team/cli' })
      .reply(400, { message: 'Repository not found' });

    await expect(linkCommand.action({ appId }, undefined)).rejects.toThrow();

    expect(scope.isDone()).toBe(true);
  });
});
