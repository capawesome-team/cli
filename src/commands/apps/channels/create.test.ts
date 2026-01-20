import { DEFAULT_API_BASE_URL } from '@/config/consts.js';
import authorizationService from '@/services/authorization-service.js';
import { prompt } from '@/utils/prompt.js';
import userConfig from '@/utils/user-config.js';
import consola from 'consola';
import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import createChannelCommand from './create.js';

// Mock dependencies
vi.mock('@/utils/user-config.js');
vi.mock('@/utils/prompt.js');
vi.mock('@/services/authorization-service.js');
vi.mock('consola');
vi.mock('@/utils/environment.js', () => ({
  isInteractive: () => true,
}));

describe('apps-channels-create', () => {
  const mockUserConfig = vi.mocked(userConfig);
  const mockPrompt = vi.mocked(prompt);
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

  it('should create channel with provided options', async () => {
    const appId = 'app-123';
    const channelName = 'production';
    const forceSignature = true;
    const channelId = 'channel-456';
    const testToken = 'test-token';

    const options = { appId, name: channelName, forceSignature };

    const scope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/channels`, {
        appId,
        name: channelName,
        forceAppBuildArtifactSignature: forceSignature,
      })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: channelId, name: channelName });

    await createChannelCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockConsola.success).toHaveBeenCalledWith('Channel created successfully.');
    expect(mockConsola.info).toHaveBeenCalledWith(`Channel ID: ${channelId}`);
  });

  it('should prompt for app when not provided', async () => {
    const channelName = 'staging';
    const orgId = 'org-1';
    const appId = 'app-1';
    const channelId = 'channel-456';
    const testToken = 'test-token';

    const options = { name: channelName };

    const orgsScope = nock(DEFAULT_API_BASE_URL)
      .get('/v1/organizations')
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, [{ id: orgId, name: 'Org 1' }]);

    const appsScope = nock(DEFAULT_API_BASE_URL)
      .get('/v1/apps')
      .query({ organizationId: orgId })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, [{ id: appId, name: 'App 1' }]);

    const createScope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/channels`, {
        appId,
        name: channelName,
        forceAppBuildArtifactSignature: undefined,
      })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: channelId, name: channelName });

    mockPrompt
      .mockResolvedValueOnce(orgId) // organization selection
      .mockResolvedValueOnce(appId); // app selection

    await createChannelCommand.action(options, undefined);

    expect(orgsScope.isDone()).toBe(true);
    expect(appsScope.isDone()).toBe(true);
    expect(createScope.isDone()).toBe(true);
    expect(mockConsola.success).toHaveBeenCalledWith('Channel created successfully.');
  });

  it('should prompt for channel name when not provided', async () => {
    const options = { appId: 'app-123' };

    const scope = nock(DEFAULT_API_BASE_URL)
      .post('/v1/apps/app-123/channels', {
        appId: 'app-123',
        name: 'development',
        forceAppBuildArtifactSignature: undefined,
      })
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(201, { id: 'channel-456', name: 'development' });

    mockPrompt.mockResolvedValueOnce('development');

    await createChannelCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockPrompt).toHaveBeenCalledWith('Enter the name of the channel:', { type: 'text' });
  });

  it('should handle error with ignoreErrors flag', async () => {
    const options = { appId: 'app-123', name: 'production', ignoreErrors: true };

    const scope = nock(DEFAULT_API_BASE_URL)
      .post('/v1/apps/app-123/channels')
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(400, { message: 'Channel name already exists' });

    await expect(createChannelCommand.action(options, undefined)).rejects.toThrow('Process exited with code 0');

    expect(scope.isDone()).toBe(true);
    expect(mockConsola.error).toHaveBeenCalled();
  });

  it('should handle error without ignoreErrors flag', async () => {
    const options = { appId: 'app-123', name: 'production' };

    const scope = nock(DEFAULT_API_BASE_URL)
      .post('/v1/apps/app-123/channels')
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(400, { message: 'Channel name already exists' });

    await expect(createChannelCommand.action(options, undefined)).rejects.toThrow();

    expect(scope.isDone()).toBe(true);
  });

  it('should create channel with expiresInDays option', async () => {
    const appId = 'app-123';
    const channelName = 'production';
    const expiresInDays = 30;
    const channelId = 'channel-456';
    const testToken = 'test-token';

    const options = { appId, name: channelName, expiresInDays };

    // Calculate expected expiration date
    const expectedExpiresAt = new Date();
    expectedExpiresAt.setDate(expectedExpiresAt.getDate() + expiresInDays);

    const scope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/channels`, (body) => {
        // Verify the request includes expiresAt and it's approximately correct (within 1 minute)
        const actualExpiresAt = new Date(body.expiresAt);
        const timeDiff = Math.abs(actualExpiresAt.getTime() - expectedExpiresAt.getTime());
        const oneMinute = 60 * 1000;

        return (
          body.appId === appId &&
          body.name === channelName &&
          body.forceAppBuildArtifactSignature === undefined &&
          timeDiff < oneMinute
        );
      })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: channelId, name: channelName });

    await createChannelCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockConsola.success).toHaveBeenCalledWith('Channel created successfully.');
    expect(mockConsola.info).toHaveBeenCalledWith(`Channel ID: ${channelId}`);
  });
});
