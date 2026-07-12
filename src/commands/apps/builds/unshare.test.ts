import { DEFAULT_API_BASE_URL } from '@/config/consts.js';
import authorizationService from '@/services/authorization-service.js';
import userConfig from '@/utils/user-config.js';
import consola from 'consola';
import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import unshareCommand from './unshare.js';

// Mock dependencies
vi.mock('@/utils/user-config.js');
vi.mock('@/utils/prompt.js');
vi.mock('@/services/authorization-service.js');
vi.mock('consola');

vi.mock('@/utils/environment.js', () => ({
  isInteractive: () => false,
}));

describe('apps-builds-unshare', () => {
  const mockUserConfig = vi.mocked(userConfig);
  const mockAuthorizationService = vi.mocked(authorizationService);
  const mockConsola = vi.mocked(consola);

  const testToken = 'test-token';
  const appId = '00000000-0000-0000-0000-000000000001';
  const buildId = '00000000-0000-0000-0000-000000000002';
  const shareId = 'share-abc';

  beforeEach(() => {
    vi.clearAllMocks();

    mockUserConfig.read.mockReturnValue({ token: testToken });
    mockAuthorizationService.hasAuthorizationToken.mockReturnValue(true);
    mockAuthorizationService.getCurrentAuthorizationToken.mockReturnValue(testToken);

    vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
      throw new Error(`Process exited with code ${code}`);
    });
  });

  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
  });

  it('should revoke the active share', async () => {
    const options = { appId, buildId, yes: true };

    const sharesScope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}/builds/${buildId}/shares`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, [
        {
          id: shareId,
          appBuildId: buildId,
          description: null,
          expiresAt: null,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ]);

    const deleteScope = nock(DEFAULT_API_BASE_URL)
      .delete(`/v1/apps/${appId}/builds/${buildId}/shares/${shareId}`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(204);

    await unshareCommand.action(options, undefined);

    expect(sharesScope.isDone()).toBe(true);
    expect(deleteScope.isDone()).toBe(true);
    expect(mockConsola.success).toHaveBeenCalledWith('Share revoked successfully.');
  });

  it('should error when the build is not shared', async () => {
    const options = { appId, buildId, yes: true };

    nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}/builds/${buildId}/shares`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, []);

    await expect(unshareCommand.action(options, undefined)).rejects.toThrow('Process exited with code 1');
    expect(mockConsola.error).toHaveBeenCalledWith('This build is not shared.');
  });

  it('should error when no app ID is provided in non-interactive environment', async () => {
    const options = {};

    await expect(unshareCommand.action(options, undefined)).rejects.toThrow('Process exited with code 1');
    expect(mockConsola.error).toHaveBeenCalledWith(
      'You must provide an app ID when running in non-interactive environment.',
    );
  });
});
