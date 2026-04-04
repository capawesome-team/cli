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
vi.mock('@/utils/git.js', () => ({
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

  beforeEach(() => {
    vi.clearAllMocks();

    mockUserConfig.read.mockReturnValue({ token: 'test-token' });
    mockAuthorizationService.getCurrentAuthorizationToken.mockReturnValue('test-token');
    mockAuthorizationService.hasAuthorizationToken.mockReturnValue(true);

    vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
      throw new Error(`Process exited with code ${code}`);
    });
  });

  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
  });

  it('should link repository with provided app ID', async () => {
    const appId = 'app-123';
    const testToken = 'test-token';

    const options = { appId };

    const scope = nock(DEFAULT_API_BASE_URL)
      .put(`/v1/apps/${appId}/repository`, {
        ownerSlug: 'capawesome-team',
        provider: 'github',
        repositorySlug: 'cli',
      })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, { id: appId, name: 'Test App' });

    await linkCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockConsola.success).toHaveBeenCalledWith('Repository connected successfully.');
  });

  it('should prompt for organization and app when app ID is not provided', async () => {
    const appId = 'app-123';
    const orgId = 'org-1';
    const testToken = 'test-token';

    const options = {};

    mockPromptOrganizationSelection.mockResolvedValueOnce(orgId);
    mockPromptAppSelection.mockResolvedValueOnce(appId);

    const scope = nock(DEFAULT_API_BASE_URL)
      .put(`/v1/apps/${appId}/repository`, {
        ownerSlug: 'capawesome-team',
        provider: 'github',
        repositorySlug: 'cli',
      })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, { id: appId, name: 'Test App' });

    await linkCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockPromptOrganizationSelection).toHaveBeenCalled();
    expect(mockPromptAppSelection).toHaveBeenCalledWith(orgId);
    expect(mockConsola.success).toHaveBeenCalledWith('Repository connected successfully.');
  });

  it('should handle API error', async () => {
    const appId = 'app-123';
    const testToken = 'test-token';

    const options = { appId };

    const scope = nock(DEFAULT_API_BASE_URL)
      .put(`/v1/apps/${appId}/repository`, {
        ownerSlug: 'capawesome-team',
        provider: 'github',
        repositorySlug: 'cli',
      })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(400, { message: 'Git provider not connected' });

    await expect(linkCommand.action(options, undefined)).rejects.toThrow();

    expect(scope.isDone()).toBe(true);
  });
});
