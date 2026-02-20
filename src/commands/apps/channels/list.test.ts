import { DEFAULT_API_BASE_URL } from '@/config/consts.js';
import authorizationService from '@/services/authorization-service.js';
import { prompt } from '@/utils/prompt.js';
import userConfig from '@/utils/user-config.js';
import consola from 'consola';
import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import listChannelsCommand from './list.js';

// Mock dependencies
vi.mock('@/utils/user-config.js');
vi.mock('@/utils/prompt.js');
vi.mock('@/services/authorization-service.js');
vi.mock('consola');

describe('apps-channels-list', () => {
  const mockUserConfig = vi.mocked(userConfig);
  const mockPrompt = vi.mocked(prompt);
  const mockConsola = vi.mocked(consola);
  const mockAuthorizationService = vi.mocked(authorizationService);

  beforeEach(() => {
    vi.clearAllMocks();

    mockUserConfig.read.mockReturnValue({ token: 'test-token' });
    mockAuthorizationService.hasAuthorizationToken.mockReturnValue(true);
    mockAuthorizationService.getCurrentAuthorizationToken.mockReturnValue('test-token');

    vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
      throw new Error(`Process exited with code ${code}`);
    });
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'table').mockImplementation(() => {});
  });

  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
  });

  it('should require authentication', async () => {
    const appId = 'app-123';

    const options = { appId };

    mockAuthorizationService.hasAuthorizationToken.mockReturnValue(false);

    await expect(listChannelsCommand.action(options, undefined)).rejects.toThrow('Process exited with code 1');

    expect(mockConsola.error).toHaveBeenCalledWith(
      'You must be logged in to run this command. Set the `CAPAWESOME_TOKEN` environment variable or use the `--token` option.',
    );
  });

  it('should require appId', async () => {
    const options = { appId: undefined };

    await expect(listChannelsCommand.action(options, undefined)).rejects.toThrow('Process exited with code 1');

    expect(mockConsola.error).toHaveBeenCalledWith(
      'You must provide an app ID when running in non-interactive environment.',
    );
  });

  it('should list channels and display table format', async () => {
    const appId = 'app-123';
    const testToken = 'test-token';
    const channels = [
      {
        id: 'channel-1',
        name: 'production',
        protectedAt: null,
        appId,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      },
      {
        id: 'channel-2',
        name: 'staging',
        protectedAt: null,
        appId,
        createdAt: '2023-01-02T00:00:00Z',
        updatedAt: '2023-01-02T00:00:00Z',
      },
    ];

    const options = { appId };

    const scope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}/channels`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, channels);

    await listChannelsCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(console.table).toHaveBeenCalledWith(channels);
    expect(mockConsola.success).toHaveBeenCalledWith('Channels retrieved successfully.');
  });

  it('should list channels with JSON format', async () => {
    const appId = 'app-123';
    const testToken = 'test-token';
    const channels = [
      {
        id: 'channel-1',
        name: 'production',
        appId,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      },
    ];

    const options = { appId, json: true };

    const scope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}/channels`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, channels);

    await listChannelsCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(console.log).toHaveBeenCalledWith(JSON.stringify(channels, null, 2));
    expect(mockConsola.success).not.toHaveBeenCalled();
  });

  it('should handle empty channels list', async () => {
    const appId = 'app-123';
    const testToken = 'test-token';

    const options = { appId };

    const scope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}/channels`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, []);

    await listChannelsCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(console.table).toHaveBeenCalledWith([]);
    expect(mockConsola.success).toHaveBeenCalledWith('Channels retrieved successfully.');
  });

  it('should handle API error', async () => {
    const appId = 'app-123';
    const testToken = 'test-token';

    const options = { appId };

    const scope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}/channels`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(500, { message: 'Internal server error' });

    await expect(listChannelsCommand.action(options, undefined)).rejects.toThrow();

    expect(scope.isDone()).toBe(true);
  });
});
