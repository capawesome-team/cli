import { DEFAULT_API_BASE_URL } from '@/config/consts.js';
import authorizationService from '@/services/authorization-service.js';
import userConfig from '@/utils/userConfig.js';
import consola from 'consola';
import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import getChannelCommand from './get.js';

// Mock dependencies
vi.mock('@/utils/userConfig.js');
vi.mock('@/services/authorization-service.js');
vi.mock('consola');

describe('apps-channels-get', () => {
  const mockUserConfig = vi.mocked(userConfig);
  const mockConsola = vi.mocked(consola);
  const mockAuthorizationService = vi.mocked(authorizationService);

  beforeEach(() => {
    vi.clearAllMocks();

    mockUserConfig.read.mockReturnValue({ token: 'test-token' });
    mockAuthorizationService.hasAuthorizationToken.mockReturnValue(true);
    mockAuthorizationService.getCurrentAuthorizationToken.mockReturnValue('test-token');

    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'table').mockImplementation(() => {});
  });

  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
  });

  it('should require authentication', async () => {
    const appId = 'app-123';
    const channelId = 'channel-456';

    const options = { appId, channelId };

    mockAuthorizationService.hasAuthorizationToken.mockReturnValue(false);

    await getChannelCommand.action(options, undefined);

    expect(mockConsola.error).toHaveBeenCalledWith('You must be logged in to run this command.');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should require appId', async () => {
    const channelId = 'channel-456';

    const options = { channelId };

    await getChannelCommand.action(options, undefined);

    expect(mockConsola.error).toHaveBeenCalledWith('You must provide an app ID.');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should require channelId or name', async () => {
    const appId = 'app-123';

    const options = { appId };

    await getChannelCommand.action(options, undefined);

    expect(mockConsola.error).toHaveBeenCalledWith('You must provide a channel ID or name.');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should get channel by channelId and display table format', async () => {
    const appId = 'app-123';
    const channelId = 'channel-456';
    const testToken = 'test-token';
    const channel = {
      id: channelId,
      name: 'production',
      totalAppBundleLimit: 10,
      appId,
    };

    const options = { appId, channelId };

    const scope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}/channels/${channelId}`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, channel);

    await getChannelCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(console.table).toHaveBeenCalledWith(channel);
    expect(mockConsola.success).toHaveBeenCalledWith('Channel retrieved successfully.');
  });

  it('should get channel by name and display JSON format', async () => {
    const appId = 'app-123';
    const channelName = 'staging';
    const testToken = 'test-token';
    const channel = {
      id: 'channel-789',
      name: channelName,
      totalAppBundleLimit: 5,
      appId,
    };

    const options = { appId, name: channelName, json: true };

    const scope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}/channels`)
      .query({ name: channelName })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, [channel]);

    await getChannelCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(console.log).toHaveBeenCalledWith(JSON.stringify(channel, null, 2));
    expect(mockConsola.success).not.toHaveBeenCalled();
  });

  it('should handle channel not found by channelId', async () => {
    const appId = 'app-123';
    const channelId = 'channel-456';
    const testToken = 'test-token';

    const options = { appId, channelId };

    const scope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}/channels/${channelId}`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(404, { message: 'Channel not found' });

    await getChannelCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockConsola.error).toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should handle channel not found by name', async () => {
    const appId = 'app-123';
    const channelName = 'nonexistent';
    const testToken = 'test-token';

    const options = { appId, name: channelName };

    const scope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}/channels`)
      .query({ name: channelName })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, []);

    await getChannelCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockConsola.error).toHaveBeenCalledWith('Channel not found.');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should handle API error', async () => {
    const appId = 'app-123';
    const channelId = 'channel-456';
    const testToken = 'test-token';

    const options = { appId, channelId };

    const scope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}/channels/${channelId}`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(500, { message: 'Internal server error' });

    await getChannelCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockConsola.error).toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
