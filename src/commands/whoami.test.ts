import { DEFAULT_API_BASE_URL } from '@/config/consts.js';
import userConfig from '@/utils/user-config.js';
import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import whoamiCommand from './whoami.js';

// Mock only the dependencies we need to control
vi.mock('@/utils/user-config.js');

describe('whoami', () => {
  const mockUserConfig = vi.mocked(userConfig);

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

    // Mock userConfig.read to return our test token
    mockUserConfig.read.mockReturnValue({ token: testToken });

    // Set up nock to intercept the /v1/users/me request
    const scope = nock(DEFAULT_API_BASE_URL)
      .get('/v1/users/me')
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, { id: 'user-456', email: 'user@example.com' });

    await whoamiCommand.action({}, undefined);

    expect(scope.isDone()).toBe(true);
  });
});
