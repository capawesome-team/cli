import { DEFAULT_API_BASE_URL } from '@/config/consts.js';
import authorizationService from '@/services/authorization-service.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import userConfig from '@/utils/user-config.js';
import consola from 'consola';
import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import getConfigurationCommand from './get.js';

// Mock dependencies
vi.mock('@/utils/user-config.js');
vi.mock('@/utils/prompt.js');
vi.mock('@/services/authorization-service.js');
vi.mock('consola');
vi.mock('@/utils/environment.js', () => ({
  isInteractive: () => true,
}));

describe('apps-configurations-get', () => {
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
    vi.spyOn(console, 'table').mockImplementation(() => {});
  });

  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
  });

  it('should get configuration by ID and display table format', async () => {
    const appId = 'app-123';
    const configurationId = 'configuration-456';
    const configuration = { id: configurationId, appId, name: 'production' };

    const options = { appId, configurationId };

    const scope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}/configurations/${configurationId}`)
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(200, configuration);

    await getConfigurationCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(console.table).toHaveBeenCalledWith(configuration);
    expect(mockConsola.success).toHaveBeenCalledWith('Native configuration retrieved successfully.');
  });

  it('should get configuration by name and display JSON format', async () => {
    const appId = 'app-123';
    const configurationName = 'staging';
    const configuration = { id: 'configuration-789', appId, name: configurationName };

    const options = { appId, json: true, name: configurationName };

    const scope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}/configurations`)
      .query({ name: configurationName })
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(200, [configuration]);

    await getConfigurationCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(console.log).toHaveBeenCalledWith(JSON.stringify(configuration, null, 2));
    expect(mockConsola.success).not.toHaveBeenCalled();
  });

  it('should prompt for app and configuration when not provided', async () => {
    const orgId = 'org-1';
    const appId = 'app-1';
    const configurationId = 'configuration-456';
    const configurationName = 'development';
    const configuration = { id: configurationId, appId, name: configurationName };

    const options = {};

    const listScope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}/configurations`)
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(200, [configuration]);
    const getScope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}/configurations/${configurationId}`)
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(200, configuration);

    mockPromptOrganizationSelection.mockResolvedValueOnce(orgId);
    mockPromptAppSelection.mockResolvedValueOnce(appId);
    mockPrompt.mockResolvedValueOnce(configurationId);

    await getConfigurationCommand.action(options, undefined);

    expect(listScope.isDone()).toBe(true);
    expect(getScope.isDone()).toBe(true);
    expect(mockPrompt).toHaveBeenCalledWith('Select the native configuration:', {
      type: 'select',
      options: [{ label: configurationName, value: configurationId }],
    });
    expect(mockConsola.success).toHaveBeenCalledWith('Native configuration retrieved successfully.');
  });

  it('should handle configuration not found by name', async () => {
    const appId = 'app-123';
    const configurationName = 'nonexistent';

    const options = { appId, name: configurationName };

    const scope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}/configurations`)
      .query({ name: configurationName })
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(200, []);

    await expect(getConfigurationCommand.action(options, undefined)).rejects.toThrow('Process exited with code 1');

    expect(scope.isDone()).toBe(true);
    expect(mockConsola.error).toHaveBeenCalledWith('Native configuration not found.');
  });

  it('should handle API error', async () => {
    const appId = 'app-123';
    const configurationId = 'configuration-456';

    const options = { appId, configurationId };

    const scope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}/configurations/${configurationId}`)
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(500, { message: 'Internal server error' });

    await expect(getConfigurationCommand.action(options, undefined)).rejects.toThrow();

    expect(scope.isDone()).toBe(true);
  });
});
