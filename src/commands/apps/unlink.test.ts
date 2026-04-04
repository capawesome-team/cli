import { DEFAULT_API_BASE_URL } from '@/config/consts.js';
import authorizationService from '@/services/authorization-service.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import userConfig from '@/utils/user-config.js';
import consola from 'consola';
import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import unlinkCommand from './unlink.js';

vi.mock('@/utils/user-config.js');
vi.mock('@/utils/prompt.js');
vi.mock('@/services/authorization-service.js');
vi.mock('consola');
vi.mock('@/utils/environment.js', () => ({
  isInteractive: () => true,
}));

describe('apps-unlink', () => {
  const mockUserConfig = vi.mocked(userConfig);
  const mockPrompt = vi.mocked(prompt);
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

  it('should unlink repository with provided app ID and --yes flag', async () => {
    const appId = 'app-123';
    const testToken = 'test-token';

    const options = { appId, yes: true };

    const scope = nock(DEFAULT_API_BASE_URL)
      .delete(`/v1/apps/${appId}/repository`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(204);

    await unlinkCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockConsola.success).toHaveBeenCalledWith('Repository disconnected successfully.');
  });

  it('should prompt for confirmation when --yes is not provided', async () => {
    const appId = 'app-123';
    const testToken = 'test-token';

    const options = { appId };

    mockPrompt.mockResolvedValueOnce(true);

    const scope = nock(DEFAULT_API_BASE_URL)
      .delete(`/v1/apps/${appId}/repository`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(204);

    await unlinkCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockPrompt).toHaveBeenCalledWith('Are you sure you want to disconnect the repository?', {
      type: 'confirm',
    });
    expect(mockConsola.success).toHaveBeenCalledWith('Repository disconnected successfully.');
  });

  it('should abort when user declines confirmation', async () => {
    const appId = 'app-123';

    const options = { appId };

    mockPrompt.mockResolvedValueOnce(false);

    await unlinkCommand.action(options, undefined);

    expect(mockConsola.success).not.toHaveBeenCalled();
  });

  it('should prompt for organization and app when app ID is not provided', async () => {
    const appId = 'app-123';
    const orgId = 'org-1';
    const testToken = 'test-token';

    const options = { yes: true };

    mockPromptOrganizationSelection.mockResolvedValueOnce(orgId);
    mockPromptAppSelection.mockResolvedValueOnce(appId);

    const scope = nock(DEFAULT_API_BASE_URL)
      .delete(`/v1/apps/${appId}/repository`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(204);

    await unlinkCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockPromptOrganizationSelection).toHaveBeenCalled();
    expect(mockPromptAppSelection).toHaveBeenCalledWith(orgId);
    expect(mockConsola.success).toHaveBeenCalledWith('Repository disconnected successfully.');
  });

  it('should handle API error', async () => {
    const appId = 'app-123';
    const testToken = 'test-token';

    const options = { appId, yes: true };

    const scope = nock(DEFAULT_API_BASE_URL)
      .delete(`/v1/apps/${appId}/repository`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(400, { message: 'No repository linked to this app' });

    await expect(unlinkCommand.action(options, undefined)).rejects.toThrow();

    expect(scope.isDone()).toBe(true);
  });
});
