import { DEFAULT_API_BASE_URL } from '@/config/consts.js';
import authorizationService from '@/services/authorization-service.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
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
vi.mock('@/utils/environment.js', () => ({
  isInteractive: () => true,
}));

describe('apps-channels-update', () => {
  const mockUserConfig = vi.mocked(userConfig);
  const mockPrompt = vi.mocked(prompt);
  const mockPromptOrganizationSelection = vi.mocked(promptOrganizationSelection);
  const mockPromptAppSelection = vi.mocked(promptAppSelection);
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
    mockPrompt.mockResolvedValueOnce(false);

    await expect(updateChannelCommand.action(options, undefined)).rejects.toThrow('Process exited with code 1');

    expect(mockConsola.error).toHaveBeenCalledWith('You must be logged in to run this command.');
    expect(mockConsola.error).toHaveBeenCalledWith('Please run the `login` command first.');
  });

  it('should update channel with provided options', async () => {
    const appId = 'app-123';
    const channelId = 'channel-456';
    const channelName = 'updated-production';
    const testToken = 'test-token';

    const options = { appId, channelId, name: channelName };

    const scope = nock(DEFAULT_API_BASE_URL)
      .patch(`/v1/apps/${appId}/channels/${channelId}`, {
        appId,
        appChannelId: channelId,
        name: channelName,
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

    const options = { channelId };

    const updateScope = nock(DEFAULT_API_BASE_URL)
      .patch(`/v1/apps/${appId}/channels/${channelId}`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, { id: channelId });

    mockPromptOrganizationSelection.mockResolvedValueOnce(orgId);
    mockPromptAppSelection.mockResolvedValueOnce(appId);
    mockPrompt.mockResolvedValueOnce(channelId); // channel ID input

    await updateChannelCommand.action(options, undefined);

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

  it('should exit when promptOrganizationSelection exits', async () => {
    const options = { name: 'new-name' };

    mockPromptOrganizationSelection.mockImplementation(() => {
      process.exit(1);
      return Promise.resolve('');
    });

    try {
      await updateChannelCommand.action(options, undefined);
    } catch (error: any) {
      expect(error.message).toBe('Process exited with code 1');
    }
  });
});
