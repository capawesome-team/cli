import { DEFAULT_API_BASE_URL } from '@/config/consts.js';
import authorizationService from '@/services/authorization-service.js';
import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import whoamiCommand from './whoami.js';

// Mock only the dependencies we need to control
vi.mock('@/services/authorization-service.js');

describe('whoami', () => {
  const mockAuthorizationService = vi.mocked(authorizationService);

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
  });

  it('should send Bearer token in Authorization header when checking current user', async () => {
    const testToken = 'user-token-456';

    // Mock the authorization service to return our test token
    mockAuthorizationService.getCurrentAuthorizationToken.mockReturnValue(testToken);

    // Set up nock to intercept the /v1/users/me request
    const scope = nock(DEFAULT_API_BASE_URL)
      .get('/v1/users/me')
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, { id: 'user-456', email: 'user@example.com' });

    await whoamiCommand.action({}, undefined);

    expect(scope.isDone()).toBe(true);
  });
});
