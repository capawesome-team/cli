import { DEFAULT_API_BASE_URL, DEFAULT_CONSOLE_BASE_URL } from '@/config/consts.js';
import configService from '@/services/config.js';
import sessionCodesService from '@/services/session-code.js';
import sessionsService from '@/services/sessions.js';
import { prompt } from '@/utils/prompt.js';
import userConfig from '@/utils/user-config.js';
import consola from 'consola';
import nock from 'nock';
import open from 'open';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import loginCommand from './login.js';

// Mock dependencies
vi.mock('@/utils/user-config.js');
vi.mock('@/services/session-code.js');
vi.mock('@/services/sessions.js');
vi.mock('@/services/config.js');
vi.mock('open');
vi.mock('consola');
vi.mock('@/utils/prompt.js');
vi.mock('std-env', () => ({
  isCI: false,
}));
vi.mock('std-env', () => ({
  isCI: false,
}));

describe('login', () => {
  const mockUserConfig = vi.mocked(userConfig);
  const mockSessionCodesService = vi.mocked(sessionCodesService);
  const mockSessionsService = vi.mocked(sessionsService);
  const mockConfigService = vi.mocked(configService);
  const mockOpen = vi.mocked(open);
  const mockConsola = vi.mocked(consola);
  const mockPrompt = vi.mocked(prompt);

  beforeEach(() => {
    vi.clearAllMocks();

    mockUserConfig.write.mockImplementation(() => {});
    mockUserConfig.read.mockReturnValue({});

    // Mock config service to return consistent URLs
    mockConfigService.getValueForKey.mockImplementation((key: string) => {
      if (key === 'CONSOLE_BASE_URL') return Promise.resolve(DEFAULT_CONSOLE_BASE_URL);
      if (key === 'API_BASE_URL') return Promise.resolve(DEFAULT_API_BASE_URL);
      return Promise.resolve('');
    });

    vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
      throw new Error(`Process exited with code ${code}`);
    });
  });

  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
  });

  it('should use the provided token for authentication', async () => {
    const testToken = 'valid-token-123';
    const options = { token: testToken };

    // Mock userConfig.read to return our test token after it's written
    mockUserConfig.read.mockReturnValue({ token: testToken });

    // Set up nock to intercept the /v1/users/me request
    const scope = nock(DEFAULT_API_BASE_URL)
      .get('/v1/users/me')
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, { id: 'user-123', email: 'test@example.com' });

    await loginCommand.action(options, undefined);

    expect(mockUserConfig.write).toHaveBeenCalledWith({ token: testToken });
    expect(scope.isDone()).toBe(true);
    expect(mockConsola.success).toHaveBeenCalledWith('Successfully signed in.');
  });

  it('should open the browser', async () => {
    const options = {};

    mockPrompt
      .mockResolvedValueOnce('browser') // authentication method
      .mockResolvedValueOnce(true); // should proceed

    mockSessionCodesService.create.mockResolvedValue({
      id: 'device-code-123',
      code: 'ABCD1234',
    });

    mockSessionsService.create.mockResolvedValue({ id: 'session-123' });

    // Mock userConfig.read to return the session token
    mockUserConfig.read.mockReturnValue({ token: 'session-123' });

    // Set up nock to intercept the /v1/users/me request
    const scope = nock(DEFAULT_API_BASE_URL)
      .get('/v1/users/me')
      .matchHeader('Authorization', `Bearer session-123`)
      .reply(200, { id: 'user-123', email: 'test@example.com' });

    await loginCommand.action(options, undefined);

    expect(mockPrompt).toHaveBeenCalledWith('How would you like to authenticate Capawesome CLI?', {
      type: 'select',
      options: [
        { label: 'Login with a web browser', value: 'browser' },
        { label: 'Paste an authentication token', value: 'token' },
      ],
    });
    expect(mockSessionCodesService.create).toHaveBeenCalled();
    expect(mockConsola.box).toHaveBeenCalledWith('Copy your one-time code: ABCD-1234');
    expect(mockOpen).toHaveBeenCalledWith(`${DEFAULT_CONSOLE_BASE_URL}/login/device`);
    expect(scope.isDone()).toBe(true);
    expect(mockConsola.success).toHaveBeenCalledWith('Successfully signed in.');
  });

  it('should throw an error because the provided token is empty', async () => {
    const options = { token: '' };

    // This test should exit early without making API calls since empty token is caught in login logic
    await expect(loginCommand.action(options, undefined)).rejects.toThrow('Process exited with code 1');

    expect(mockConsola.error).toHaveBeenCalledWith(
      `Please provide a valid token. You can create a token at ${DEFAULT_CONSOLE_BASE_URL}/settings/tokens.`,
    );
  });

  it('should throw an error because the provided token is invalid', async () => {
    const invalidToken = 'invalid-token';
    const options = { token: invalidToken };

    // Mock userConfig.read to return our invalid token after it's written
    mockUserConfig.read.mockReturnValue({ token: invalidToken });

    // Set up nock to intercept the /v1/users/me request and return 401
    const scope = nock(DEFAULT_API_BASE_URL)
      .get('/v1/users/me')
      .matchHeader('Authorization', `Bearer ${invalidToken}`)
      .reply(401, { message: 'Unauthorized' });

    await expect(loginCommand.action(options, undefined)).rejects.toThrow('Process exited with code 1');

    expect(mockUserConfig.write).toHaveBeenCalledWith({ token: invalidToken });
    expect(mockUserConfig.write).toHaveBeenCalledWith({}); // Clears token on error
    expect(scope.isDone()).toBe(true);
    expect(mockConsola.error).toHaveBeenCalledWith(
      `Invalid token. Please provide a valid token. You can create a token at ${DEFAULT_CONSOLE_BASE_URL}/settings/tokens.`,
    );
  });
});
