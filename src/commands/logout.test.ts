import { DEFAULT_API_BASE_URL } from '@/config/consts.js';
import authorizationService from '@/services/authorization-service.js';
import credentialStore from '@/utils/credential-store.js';
import userConfig from '@/utils/user-config.js';
import consola from 'consola';
import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import logoutCommand from './logout.js';

// Mock dependencies
vi.mock('@/services/authorization-service.js');
vi.mock('@/utils/credential-store.js');
vi.mock('@/utils/user-config.js');
vi.mock('consola');

describe('logout', () => {
  const mockAuthorizationService = vi.mocked(authorizationService);
  const mockCredentialStore = vi.mocked(credentialStore);
  const mockUserConfig = vi.mocked(userConfig);
  const mockConsola = vi.mocked(consola);

  beforeEach(() => {
    vi.clearAllMocks();

    mockCredentialStore.deleteToken.mockImplementation(() => {});
    mockUserConfig.write.mockImplementation(() => {});
    mockUserConfig.read.mockReturnValue({});
  });

  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
  });

  it('should delete session and clear credentials with session token', async () => {
    const sessionToken = 'session-123';
    mockAuthorizationService.getCurrentAuthorizationToken.mockReturnValue(sessionToken);

    // Set up nock to intercept the DELETE request
    const scope = nock(DEFAULT_API_BASE_URL).delete('/v1/sessions/session-123').reply(200);

    await logoutCommand.action({}, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockCredentialStore.deleteToken).toHaveBeenCalled();
    expect(mockConsola.success).toHaveBeenCalledWith('Successfully signed out.');
  });

  it('should delete the session by its stored id when available', async () => {
    mockAuthorizationService.getCurrentAuthorizationToken.mockReturnValue('session-token-xyz');
    mockUserConfig.read.mockReturnValue({ sessionId: 'session-id-abc', token: 'session-token-xyz', userId: 'user-1' });

    // The session must be deleted by its id, not by the token
    const scope = nock(DEFAULT_API_BASE_URL).delete('/v1/sessions/session-id-abc').reply(200);

    await logoutCommand.action({}, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockCredentialStore.deleteToken).toHaveBeenCalled();
  });

  it('should only clear credentials with API token', async () => {
    const apiToken = 'ca_abc123';
    mockAuthorizationService.getCurrentAuthorizationToken.mockReturnValue(apiToken);

    await logoutCommand.action({}, undefined);

    expect(mockCredentialStore.deleteToken).toHaveBeenCalled();
    expect(mockConsola.success).toHaveBeenCalledWith('Successfully signed out.');
  });

  it('should clear the user ID but preserve other flags', async () => {
    mockAuthorizationService.getCurrentAuthorizationToken.mockReturnValue('ca_abc123');
    mockUserConfig.read.mockReturnValue({ token: 'ca_abc123', userId: 'user-1', telemetryNoticeShown: true });

    await logoutCommand.action({}, undefined);

    expect(mockUserConfig.write).toHaveBeenCalledWith({ telemetryNoticeShown: true });
  });

  it('should handle no token gracefully', async () => {
    mockAuthorizationService.getCurrentAuthorizationToken.mockReturnValue(null);

    await logoutCommand.action({}, undefined);

    expect(mockCredentialStore.deleteToken).toHaveBeenCalled();
    expect(mockConsola.success).toHaveBeenCalledWith('Successfully signed out.');
  });
});
