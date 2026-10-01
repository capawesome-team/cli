import { DEFAULT_API_BASE_URL } from '@/config/consts.js';
import authorizationService from '@/services/authorization-service.js';
import { promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import userConfig from '@/utils/user-config.js';
import consola from 'consola';
import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import updateAppCommand from './update.js';

// Mock dependencies
vi.mock('@/utils/user-config.js');
vi.mock('@/utils/prompt.js');
vi.mock('@/services/authorization-service.js');
vi.mock('consola');
vi.mock('@/utils/environment.js', () => ({
  isInteractive: () => true,
}));

describe('apps-update', () => {
  const mockUserConfig = vi.mocked(userConfig);
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

  it('should update app with provided options', async () => {
    const appId = 'app-123';

    const options = updateAppCommand.options!.schema.parse({
      appId,
      channelDiscovery: 'false',
      configuration: 'Production',
      name: 'renamed',
      nextBuildNumber: '42',
      stack: 'macos-tahoe',
      type: 'ios',
    });

    const scope = nock(DEFAULT_API_BASE_URL)
      .patch(`/v1/apps/${appId}`, {
        appChannelDiscoveryEnabled: false,
        appConfigurationName: 'Production',
        buildStack: 'macos-tahoe',
        name: 'renamed',
        nextAppBuildNumber: 42,
        type: 'ios',
      })
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(200, { id: appId, name: 'renamed' });

    await updateAppCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockConsola.success).toHaveBeenCalledWith('App updated successfully.');
  });

  it('should clear defaults when an empty string is passed', async () => {
    const appId = 'app-123';

    const options = { appId, channel: '', environment: '', stack: '' as const };

    const scope = nock(DEFAULT_API_BASE_URL)
      .patch(`/v1/apps/${appId}`, {
        appChannelName: null,
        appEnvironmentName: null,
        buildStack: null,
      })
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(200, { id: appId });

    await updateAppCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockConsola.success).toHaveBeenCalledWith('App updated successfully.');
  });

  it('should output JSON when json flag is set', async () => {
    const appId = 'app-123';
    const app = { id: appId, name: 'renamed', organizationId: 'org-1', type: 'capacitor' };

    const options = { appId, json: true, name: 'renamed' };

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const scope = nock(DEFAULT_API_BASE_URL)
      .patch(`/v1/apps/${appId}`, { name: 'renamed' })
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(200, app);

    await updateAppCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify(app, null, 2));
    expect(mockConsola.success).not.toHaveBeenCalled();
  });

  it('should prompt for app when not provided', async () => {
    const orgId = 'org-1';
    const appId = 'app-1';

    const options = { name: 'renamed' };

    const scope = nock(DEFAULT_API_BASE_URL)
      .patch(`/v1/apps/${appId}`, { name: 'renamed' })
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(200, { id: appId, name: 'renamed' });

    mockPromptOrganizationSelection.mockResolvedValueOnce(orgId);
    mockPromptAppSelection.mockResolvedValueOnce(appId);

    await updateAppCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockPromptAppSelection).toHaveBeenCalledWith(orgId);
    expect(mockConsola.success).toHaveBeenCalledWith('App updated successfully.');
  });

  it('should handle API error', async () => {
    const appId = 'app-123';

    const options = { appId, nextBuildNumber: 1 };

    const scope = nock(DEFAULT_API_BASE_URL)
      .patch(`/v1/apps/${appId}`)
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(400, { message: 'The next build number must be greater than the latest build number.' });

    await expect(updateAppCommand.action(options, undefined)).rejects.toThrow();

    expect(scope.isDone()).toBe(true);
    expect(mockConsola.success).not.toHaveBeenCalled();
  });
});
