import { DEFAULT_API_BASE_URL } from '@/config/consts.js';
import authorizationService from '@/services/authorization-service.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import userConfig from '@/utils/user-config.js';
import consola from 'consola';
import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import deleteConfigurationCommand from './delete.js';

// Mock dependencies
vi.mock('@/utils/user-config.js');
vi.mock('@/utils/prompt.js');
vi.mock('@/services/authorization-service.js');
vi.mock('consola');
vi.mock('@/utils/environment.js', () => ({
  isInteractive: () => true,
}));

describe('apps-configurations-delete', () => {
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

  it('should delete configuration by ID after confirmation', async () => {
    const appId = 'app-123';
    const configurationId = 'configuration-456';

    const options = { appId, configurationId };

    mockPrompt.mockResolvedValueOnce(true); // confirmation

    const scope = nock(DEFAULT_API_BASE_URL)
      .delete(`/v1/apps/${appId}/configurations/${configurationId}`)
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(200);

    await deleteConfigurationCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockPrompt).toHaveBeenCalledWith('Are you sure you want to delete this native configuration?', {
      type: 'confirm',
    });
    expect(mockConsola.success).toHaveBeenCalledWith('Native configuration deleted successfully.');
  });

  it('should delete configuration by name when yes flag is set', async () => {
    const appId = 'app-123';
    const configurationName = 'production';

    const options = { appId, name: configurationName, yes: true };

    const scope = nock(DEFAULT_API_BASE_URL)
      .delete(`/v1/apps/${appId}/configurations`)
      .query({ name: configurationName })
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(200);

    await deleteConfigurationCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockPrompt).not.toHaveBeenCalled();
    expect(mockConsola.success).toHaveBeenCalledWith('Native configuration deleted successfully.');
  });

  it('should not delete configuration when confirmation is declined', async () => {
    const options = { appId: 'app-123', configurationId: 'configuration-456' };

    mockPrompt.mockResolvedValueOnce(false); // declined confirmation

    await deleteConfigurationCommand.action(options, undefined);

    expect(mockConsola.success).not.toHaveBeenCalled();
  });

  it('should prompt for app and configuration when not provided', async () => {
    const orgId = 'org-1';
    const appId = 'app-1';
    const configurationId = 'configuration-456';
    const configurationName = 'development';

    const options = {};

    const listScope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}/configurations`)
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(200, [{ id: configurationId, appId, name: configurationName }]);
    const deleteScope = nock(DEFAULT_API_BASE_URL)
      .delete(`/v1/apps/${appId}/configurations/${configurationId}`)
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(200);

    mockPromptOrganizationSelection.mockResolvedValueOnce(orgId);
    mockPromptAppSelection.mockResolvedValueOnce(appId);
    mockPrompt
      .mockResolvedValueOnce(configurationId) // configuration selection
      .mockResolvedValueOnce(true); // confirmation

    await deleteConfigurationCommand.action(options, undefined);

    expect(listScope.isDone()).toBe(true);
    expect(deleteScope.isDone()).toBe(true);
    expect(mockPrompt).toHaveBeenCalledWith('Select the native configuration to delete:', {
      type: 'select',
      options: [{ label: configurationName, value: configurationId }],
    });
    expect(mockConsola.success).toHaveBeenCalledWith('Native configuration deleted successfully.');
  });

  it('should handle API error', async () => {
    const appId = 'app-123';
    const configurationId = 'configuration-456';

    const options = { appId, configurationId, yes: true };

    const scope = nock(DEFAULT_API_BASE_URL)
      .delete(`/v1/apps/${appId}/configurations/${configurationId}`)
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(404, { message: 'Configuration not found' });

    await expect(deleteConfigurationCommand.action(options, undefined)).rejects.toThrow();

    expect(scope.isDone()).toBe(true);
  });
});
