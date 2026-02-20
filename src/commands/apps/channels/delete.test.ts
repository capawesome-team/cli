import { DEFAULT_API_BASE_URL } from '@/config/consts.js';
import authorizationService from '@/services/authorization-service.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import userConfig from '@/utils/user-config.js';
import consola from 'consola';
import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import deleteChannelCommand from './delete.js';

// Mock dependencies
vi.mock('@/utils/user-config.js');
vi.mock('@/utils/prompt.js');
vi.mock('@/services/authorization-service.js');
vi.mock('consola');
vi.mock('@/utils/environment.js', () => ({
  isInteractive: () => true,
}));

describe('apps-channels-delete', () => {
  const mockUserConfig = vi.mocked(userConfig);
  const mockPrompt = vi.mocked(prompt);
  const mockPromptOrganizationSelection = vi.mocked(promptOrganizationSelection);
  const mockPromptAppSelection = vi.mocked(promptAppSelection);
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

    const options = { name: channelName };

    const deleteScope = nock(DEFAULT_API_BASE_URL)
      .delete(`/v1/apps/${appId}/channels`)
      .query({ name: channelName })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200);

    mockPromptOrganizationSelection.mockResolvedValueOnce(orgId);
    mockPromptAppSelection.mockResolvedValueOnce(appId);
    mockPrompt.mockResolvedValueOnce(true); // confirmation

    await deleteChannelCommand.action(options, undefined);

    expect(deleteScope.isDone()).toBe(true);
    expect(mockConsola.success).toHaveBeenCalledWith('Channel deleted successfully.');
  });

  it('should prompt for channel selection when channelId and name not provided', async () => {
    const appId = 'app-123';
    const channelId = 'channel-456';
    const channelName = 'development';
    const testToken = 'test-token';

    const options = { appId };

    const channelsListScope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}/channels`)
      .query(true)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, [
        {
          id: channelId,
          name: channelName,
          appId,
        },
      ]);

    const deleteScope = nock(DEFAULT_API_BASE_URL)
      .delete(`/v1/apps/${appId}/channels/${channelId}`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200);

    mockPrompt
      .mockResolvedValueOnce(channelId) // channel selection
      .mockResolvedValueOnce(true); // confirmation

    await deleteChannelCommand.action(options, undefined);

    expect(channelsListScope.isDone()).toBe(true);
    expect(deleteScope.isDone()).toBe(true);
    expect(mockPrompt).toHaveBeenCalledWith('Select the channel to delete:', {
      type: 'select',
      options: [{ label: channelName, value: channelId }],
    });
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

    await expect(deleteChannelCommand.action(options, undefined)).rejects.toThrow();

    expect(scope.isDone()).toBe(true);
  });
});
