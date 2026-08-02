import { DEFAULT_API_BASE_URL } from '@/config/consts.js';
import authorizationService from '@/services/authorization-service.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import userConfig from '@/utils/user-config.js';
import consola from 'consola';
import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import updateConfigurationCommand from './update.js';

// Mock dependencies
vi.mock('@/utils/user-config.js');
vi.mock('@/utils/prompt.js');
vi.mock('@/services/authorization-service.js');
vi.mock('consola');
vi.mock('@/utils/environment.js', () => ({
  isInteractive: () => true,
}));

describe('apps-configurations-update', () => {
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
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
  });

  it('should update configuration with provided options', async () => {
    const appId = 'app-123';
    const configurationId = 'configuration-456';
    const displayName = 'My App';
    const packageName = 'io.capawesome.app';

    const options = { appId, configurationId, displayName, packageName };

    const scope = nock(DEFAULT_API_BASE_URL)
      .patch(`/v1/apps/${appId}/configurations/${configurationId}`, {
        displayName,
        packageName,
      })
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(200, { id: configurationId, appId, displayName, packageName });

    await updateConfigurationCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockConsola.success).toHaveBeenCalledWith('Native configuration updated successfully.');
  });

  it('should clear display name and package name when empty strings are provided', async () => {
    const appId = 'app-123';
    const configurationId = 'configuration-456';

    const options = { appId, configurationId, displayName: '', packageName: '' };

    const scope = nock(DEFAULT_API_BASE_URL)
      .patch(`/v1/apps/${appId}/configurations/${configurationId}`, {
        displayName: null,
        packageName: null,
      })
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(200, { id: configurationId, appId, displayName: null, packageName: null });

    await updateConfigurationCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockConsola.success).toHaveBeenCalledWith('Native configuration updated successfully.');
  });

  it('should output JSON when json flag is set', async () => {
    const appId = 'app-123';
    const configurationId = 'configuration-456';
    const configuration = { id: configurationId, appId, name: 'production' };

    const options = { appId, configurationId, json: true, name: 'production' };

    const scope = nock(DEFAULT_API_BASE_URL)
      .patch(`/v1/apps/${appId}/configurations/${configurationId}`, { name: 'production' })
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(200, configuration);

    await updateConfigurationCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(console.log).toHaveBeenCalledWith(JSON.stringify(configuration, null, 2));
    expect(mockConsola.success).not.toHaveBeenCalled();
  });

  it('should prompt for app and configuration when not provided', async () => {
    const orgId = 'org-1';
    const appId = 'app-1';
    const configurationId = 'configuration-456';
    const configurationName = 'development';

    const options = { displayName: 'My App' };

    const listScope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}/configurations`)
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(200, [{ id: configurationId, appId, name: configurationName }]);
    const updateScope = nock(DEFAULT_API_BASE_URL)
      .patch(`/v1/apps/${appId}/configurations/${configurationId}`, { displayName: 'My App' })
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(200, { id: configurationId, appId, name: configurationName });

    mockPromptOrganizationSelection.mockResolvedValueOnce(orgId);
    mockPromptAppSelection.mockResolvedValueOnce(appId);
    mockPrompt.mockResolvedValueOnce(configurationId);

    await updateConfigurationCommand.action(options, undefined);

    expect(listScope.isDone()).toBe(true);
    expect(updateScope.isDone()).toBe(true);
    expect(mockPrompt).toHaveBeenCalledWith('Select the native configuration to update:', {
      type: 'select',
      options: [{ label: configurationName, value: configurationId }],
    });
    expect(mockConsola.success).toHaveBeenCalledWith('Native configuration updated successfully.');
  });

  it('should handle API error', async () => {
    const appId = 'app-123';
    const configurationId = 'configuration-456';

    const options = { appId, configurationId, name: 'production' };

    const scope = nock(DEFAULT_API_BASE_URL)
      .patch(`/v1/apps/${appId}/configurations/${configurationId}`)
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(404, { message: 'Configuration not found' });

    await expect(updateConfigurationCommand.action(options, undefined)).rejects.toThrow();

    expect(scope.isDone()).toBe(true);
    expect(mockConsola.success).not.toHaveBeenCalled();
  });
});
