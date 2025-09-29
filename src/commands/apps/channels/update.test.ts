import { DEFAULT_API_BASE_URL } from '@/config/consts.js';
import authorizationService from '@/services/authorization-service.js';
import { prompt } from '@/utils/prompt.js';
import userConfig from '@/utils/user-config.js';
import consola from 'consola';
import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import updateChannelCommand from './update.js';

// Mock dependencies
vi.mock('@/utils/user-config.js');
vi.mock('@/utils/prompt.js');
vi.mock('@/services/authorization-service.js');
vi.mock('consola');
vi.mock('std-env', () => ({
  hasTTY: true,
}));

describe('apps-channels-update', () => {
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

    await expect(updateChannelCommand.action(options, undefined)).rejects.toThrow('Process exited with code 1');

    expect(mockConsola.error).toHaveBeenCalledWith('You must be logged in to run this command.');
  });

  it('should update channel with provided options', async () => {
    const appId = 'app-123';
    const channelId = 'channel-456';
    const channelName = 'updated-production';
    const bundleLimit = 15;
    const testToken = 'test-token';

    const options = { appId, channelId, name: channelName, bundleLimit };

    const scope = nock(DEFAULT_API_BASE_URL)
      .patch(`/v1/apps/${appId}/channels/${channelId}`, {
        appId,
        appChannelId: channelId,
        name: channelName,
        totalAppBundleLimit: bundleLimit,
      })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, { id: channelId, name: channelName });

    await updateChannelCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockConsola.success).toHaveBeenCalledWith('Channel updated successfully.');
  });

  it('should prompt for app selection when appId not provided', async () => {
    const orgId = 'org-1';
    const appId = 'app-1';
    const channelId = 'channel-456';
    const testToken = 'test-token';
    const organization = { id: orgId, name: 'Org 1' };
    const app = { id: appId, name: 'App 1' };

    const options = { channelId, bundleLimit: 10 };

    const orgsScope = nock(DEFAULT_API_BASE_URL)
      .get('/v1/organizations')
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, [organization]);

    const appsScope = nock(DEFAULT_API_BASE_URL)
      .get('/v1/apps')
      .query({ organizationId: orgId })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, [app]);

    const updateScope = nock(DEFAULT_API_BASE_URL)
      .patch(`/v1/apps/${appId}/channels/${channelId}`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, { id: channelId });

    mockPrompt
      .mockResolvedValueOnce(orgId) // organization selection
      .mockResolvedValueOnce(appId) // app selection
      .mockResolvedValueOnce(channelId); // channel ID input

    await updateChannelCommand.action(options, undefined);

    expect(orgsScope.isDone()).toBe(true);
    expect(appsScope.isDone()).toBe(true);
    expect(updateScope.isDone()).toBe(true);
    expect(mockConsola.success).toHaveBeenCalledWith('Channel updated successfully.');
  });

  it('should prompt for channelId when not provided', async () => {
    const appId = 'app-123';
    const channelId = 'channel-456';
    const testToken = 'test-token';

    const options = { appId, name: 'staging' };

    const scope = nock(DEFAULT_API_BASE_URL)
      .patch(`/v1/apps/${appId}/channels/${channelId}`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, { id: channelId });

    mockPrompt.mockResolvedValueOnce(channelId); // channel ID input

    await updateChannelCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockPrompt).toHaveBeenCalledWith('Enter the channel ID:', { type: 'text' });
    expect(mockConsola.success).toHaveBeenCalledWith('Channel updated successfully.');
  });

  it('should handle API error during update', async () => {
    const appId = 'app-123';
    const channelId = 'channel-456';
    const testToken = 'test-token';

    const options = { appId, channelId, name: 'updated-name' };

    const scope = nock(DEFAULT_API_BASE_URL)
      .patch(`/v1/apps/${appId}/channels/${channelId}`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(404, { message: 'Channel not found' });

    await expect(updateChannelCommand.action(options, undefined)).rejects.toThrow();

    expect(scope.isDone()).toBe(true);
  });

  it('should handle error when no organizations exist', async () => {
    const testToken = 'test-token';

    const options = { name: 'new-name' };

    const scope = nock(DEFAULT_API_BASE_URL)
      .get('/v1/organizations')
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, []);

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit called with code ${code}`);
    });

    try {
      await updateChannelCommand.action(options, undefined);
    } catch (error: any) {
      expect(error.message).toBe('process.exit called with code 1');
    }

    expect(scope.isDone()).toBe(true);
    expect(mockConsola.error).toHaveBeenCalledWith('You must create an organization before updating a channel.');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
