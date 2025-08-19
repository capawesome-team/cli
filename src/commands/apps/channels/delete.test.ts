import { DEFAULT_API_BASE_URL } from '@/config/consts.js';
import authorizationService from '@/services/authorization-service.js';
import { prompt } from '@/utils/prompt.js';
import userConfig from '@/utils/userConfig.js';
import consola from 'consola';
import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import deleteChannelCommand from './delete.js';

// Mock dependencies
vi.mock('@/utils/userConfig.js');
vi.mock('@/utils/prompt.js');
vi.mock('@/services/authorization-service.js');
vi.mock('consola');
vi.mock('std-env', () => ({
  isCI: false,
}));

describe('apps-channels-delete', () => {
  const mockUserConfig = vi.mocked(userConfig);
  const mockPrompt = vi.mocked(prompt);
  const mockConsola = vi.mocked(consola);
  const mockAuthorizationService = vi.mocked(authorizationService);

  beforeEach(() => {
    vi.clearAllMocks();

    mockUserConfig.read.mockReturnValue({ token: 'test-token' });
    mockAuthorizationService.getCurrentAuthorizationToken.mockReturnValue('test-token');

    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
  });

  it('should delete channel with provided appId and channelId after confirmation', async () => {
    const appId = 'app-123';
    const channelId = 'channel-456';
    const testToken = 'test-token';

    const options = { appId, channelId };

    mockPrompt.mockResolvedValueOnce(true); // confirmation

    const scope = nock(DEFAULT_API_BASE_URL)
      .delete(`/v1/apps/${appId}/channels/${channelId}`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200);

    await deleteChannelCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockPrompt).toHaveBeenCalledWith('Are you sure you want to delete this channel?', {
      type: 'confirm',
    });
    expect(mockConsola.success).toHaveBeenCalledWith('Channel deleted successfully.');
  });

  it('should delete channel with provided appId and name after confirmation', async () => {
    const appId = 'app-123';
    const channelName = 'production';
    const testToken = 'test-token';

    const options = { appId, name: channelName };

    mockPrompt.mockResolvedValueOnce(true); // confirmation

    const scope = nock(DEFAULT_API_BASE_URL)
      .delete(`/v1/apps/${appId}/channels`)
      .query({ name: channelName })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200);

    await deleteChannelCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockConsola.success).toHaveBeenCalledWith('Channel deleted successfully.');
  });

  it('should not delete channel when confirmation is declined', async () => {
    const appId = 'app-123';
    const channelId = 'channel-456';

    const options = { appId, channelId };

    mockPrompt.mockResolvedValueOnce(false); // declined confirmation

    await deleteChannelCommand.action(options, undefined);

    expect(mockPrompt).toHaveBeenCalledWith('Are you sure you want to delete this channel?', {
      type: 'confirm',
    });
    expect(mockConsola.success).not.toHaveBeenCalled();
  });

  it('should prompt for app selection when appId not provided', async () => {
    const orgId = 'org-1';
    const appId = 'app-1';
    const channelName = 'staging';
    const testToken = 'test-token';
    const organization = { id: orgId, name: 'Org 1' };
    const app = { id: appId, name: 'App 1' };

    const options = { name: channelName };

    const orgsScope = nock(DEFAULT_API_BASE_URL)
      .get('/v1/organizations')
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, [organization]);

    const appsScope = nock(DEFAULT_API_BASE_URL)
      .get('/v1/apps')
      .query({ organizationId: orgId })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, [app]);

    const deleteScope = nock(DEFAULT_API_BASE_URL)
      .delete(`/v1/apps/${appId}/channels`)
      .query({ name: channelName })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200);

    mockPrompt
      .mockResolvedValueOnce(orgId) // organization selection
      .mockResolvedValueOnce(appId) // app selection
      .mockResolvedValueOnce(true); // confirmation

    await deleteChannelCommand.action(options, undefined);

    expect(orgsScope.isDone()).toBe(true);
    expect(appsScope.isDone()).toBe(true);
    expect(deleteScope.isDone()).toBe(true);
    expect(mockConsola.success).toHaveBeenCalledWith('Channel deleted successfully.');
  });

  it('should prompt for channel name when neither channelId nor name provided', async () => {
    const appId = 'app-123';
    const channelName = 'development';
    const testToken = 'test-token';

    const options = { appId };

    const scope = nock(DEFAULT_API_BASE_URL)
      .delete(`/v1/apps/${appId}/channels`)
      .query({ name: channelName })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200);

    mockPrompt
      .mockResolvedValueOnce(channelName) // channel name input
      .mockResolvedValueOnce(true); // confirmation

    await deleteChannelCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockPrompt).toHaveBeenCalledWith('Enter the channel name:', { type: 'text' });
    expect(mockConsola.success).toHaveBeenCalledWith('Channel deleted successfully.');
  });

  it('should handle API error during deletion', async () => {
    const appId = 'app-123';
    const channelId = 'channel-456';
    const testToken = 'test-token';

    const options = { appId, channelId };

    mockPrompt.mockResolvedValueOnce(true);

    const scope = nock(DEFAULT_API_BASE_URL)
      .delete(`/v1/apps/${appId}/channels/${channelId}`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(404, { message: 'Channel not found' });

    await deleteChannelCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockConsola.error).toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
