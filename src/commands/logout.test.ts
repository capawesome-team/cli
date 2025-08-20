import { DEFAULT_API_BASE_URL } from '@/config/consts.js';
import authorizationService from '@/services/authorization-service.js';
import userConfig from '@/utils/user-config.js';
import consola from 'consola';
import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import logoutCommand from './logout.js';

// Mock dependencies
vi.mock('@/services/authorization-service.js');
vi.mock('@/utils/user-config.js');
vi.mock('consola');

describe('logout', () => {
  const mockAuthorizationService = vi.mocked(authorizationService);
  const mockUserConfig = vi.mocked(userConfig);
  const mockConsola = vi.mocked(consola);

  beforeEach(() => {
    vi.clearAllMocks();

    mockUserConfig.write.mockImplementation(() => {});
  });

  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
  });

  it('should delete session and clear user config with session token', async () => {
    const sessionToken = 'session-123';
    mockAuthorizationService.getCurrentAuthorizationToken.mockReturnValue(sessionToken);

    // Set up nock to intercept the DELETE request
    const scope = nock(DEFAULT_API_BASE_URL).delete('/v1/sessions/session-123').reply(200);

    await logoutCommand.action({}, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockUserConfig.write).toHaveBeenCalledWith({});
    expect(mockConsola.success).toHaveBeenCalledWith('Successfully signed out.');
  });

  it('should only clear user config with API token', async () => {
    const apiToken = 'ca_abc123';
    mockAuthorizationService.getCurrentAuthorizationToken.mockReturnValue(apiToken);

    await logoutCommand.action({}, undefined);

    expect(mockUserConfig.write).toHaveBeenCalledWith({});
    expect(mockConsola.success).toHaveBeenCalledWith('Successfully signed out.');
  });

  it('should handle no token gracefully', async () => {
    mockAuthorizationService.getCurrentAuthorizationToken.mockReturnValue(null);

    await logoutCommand.action({}, undefined);

    expect(mockUserConfig.write).toHaveBeenCalledWith({});
    expect(mockConsola.success).toHaveBeenCalledWith('Successfully signed out.');
  });
});
