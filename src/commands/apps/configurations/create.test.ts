import { DEFAULT_API_BASE_URL } from '@/config/consts.js';
import authorizationService from '@/services/authorization-service.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import userConfig from '@/utils/user-config.js';
import consola from 'consola';
import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import createConfigurationCommand from './create.js';

// Mock dependencies
vi.mock('@/utils/user-config.js');
vi.mock('@/utils/prompt.js');
vi.mock('@/services/authorization-service.js');
vi.mock('consola');
vi.mock('@/utils/environment.js', () => ({
  isInteractive: () => true,
}));

describe('apps-configurations-create', () => {
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

  it('should create configuration with provided options', async () => {
    const appId = 'app-123';
    const configurationName = 'production';
    const displayName = 'My App';
    const packageName = 'io.capawesome.app';
    const configurationId = 'configuration-456';
    const testToken = 'test-token';

    const options = { appId, displayName, name: configurationName, packageName };

    const scope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/configurations`, {
        displayName,
        name: configurationName,
        packageName,
      })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: configurationId, name: configurationName });

    await createConfigurationCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockConsola.info).toHaveBeenCalledWith(`Native configuration ID: ${configurationId}`);
    expect(mockConsola.success).toHaveBeenCalledWith('Native configuration created successfully.');
  });

  it('should output JSON when json flag is set', async () => {
    const appId = 'app-123';
    const configurationName = 'production';
    const configurationId = 'configuration-456';
    const testToken = 'test-token';

    const options = { appId, json: true, name: configurationName };

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const scope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/configurations`, {
        name: configurationName,
      })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: configurationId, name: configurationName });

    await createConfigurationCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({ id: configurationId }, null, 2));
    expect(mockConsola.info).not.toHaveBeenCalled();
  });

  it('should prompt for app when not provided', async () => {
    const orgId = 'org-1';
    const appId = 'app-1';
    const configurationName = 'staging';
    const configurationId = 'configuration-456';
    const testToken = 'test-token';

    const options = { name: configurationName };

    const scope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/configurations`, {
        name: configurationName,
      })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: configurationId, name: configurationName });

    mockPromptOrganizationSelection.mockResolvedValueOnce(orgId);
    mockPromptAppSelection.mockResolvedValueOnce(appId);

    await createConfigurationCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockPromptOrganizationSelection).toHaveBeenCalledWith({ allowCreate: true });
    expect(mockPromptAppSelection).toHaveBeenCalledWith(orgId, { allowCreate: true });
    expect(mockConsola.success).toHaveBeenCalledWith('Native configuration created successfully.');
  });

  it('should prompt for configuration name when not provided', async () => {
    const options = { appId: 'app-123' };

    const scope = nock(DEFAULT_API_BASE_URL)
      .post('/v1/apps/app-123/configurations', {
        name: 'development',
      })
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(201, { id: 'configuration-456', name: 'development' });

    mockPrompt.mockResolvedValueOnce('development');

    await createConfigurationCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockPrompt).toHaveBeenCalledWith('Enter the name of the native configuration:', { type: 'text' });
  });

  it('should handle API error', async () => {
    const options = { appId: 'app-123', name: 'production' };

    const scope = nock(DEFAULT_API_BASE_URL)
      .post('/v1/apps/app-123/configurations')
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(400, { message: 'Configuration name already exists' });

    await expect(createConfigurationCommand.action(options, undefined)).rejects.toThrow();

    expect(scope.isDone()).toBe(true);
    expect(mockConsola.success).not.toHaveBeenCalled();
  });
});
