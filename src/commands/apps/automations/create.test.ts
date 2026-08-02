import { DEFAULT_API_BASE_URL } from '@/config/consts.js';
import authorizationService from '@/services/authorization-service.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import userConfig from '@/utils/user-config.js';
import consola from 'consola';
import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import createAutomationCommand from './create.js';

// Mock dependencies
vi.mock('@/utils/user-config.js');
vi.mock('@/utils/prompt.js');
vi.mock('@/services/authorization-service.js');
vi.mock('consola');
vi.mock('@/utils/environment.js', () => ({
  isInteractive: () => true,
}));

describe('apps-automations-create', () => {
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

  it('should create automation with provided options', async () => {
    const appId = 'app-123';
    const automationId = 'automation-456';

    const options = {
      appId,
      certificate: 'Release Keystore',
      configuration: 'Production',
      environment: 'Staging',
      name: 'nightly',
      platform: 'android' as const,
      stack: 'macos-tahoe' as const,
      triggerPattern: 'main',
      triggerType: 'branch' as const,
      type: 'release' as const,
    };

    const scope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/automations`, {
        appCertificateName: 'Release Keystore',
        appConfigurationName: 'Production',
        appEnvironmentName: 'Staging',
        buildStack: 'macos-tahoe',
        buildType: 'release',
        name: 'nightly',
        platform: 'android',
        triggerPattern: 'main',
        triggerType: 'branch',
      })
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(201, { id: automationId, name: 'nightly' });

    await createAutomationCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockConsola.info).toHaveBeenCalledWith(`Automation ID: ${automationId}`);
    expect(mockConsola.success).toHaveBeenCalledWith('Automation created successfully.');
  });

  it('should output JSON when json flag is set', async () => {
    const appId = 'app-123';
    const automationId = 'automation-456';

    const options = {
      appId,
      json: true,
      name: 'nightly',
      platform: 'web' as const,
      triggerType: 'tag' as const,
    };

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const scope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/automations`, {
        name: 'nightly',
        platform: 'web',
        triggerType: 'tag',
      })
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(201, { id: automationId, name: 'nightly' });

    await createAutomationCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({ id: automationId }, null, 2));
    expect(mockConsola.info).not.toHaveBeenCalled();
  });

  it('should prompt for app, name and trigger type when not provided', async () => {
    const orgId = 'org-1';
    const appId = 'app-1';
    const automationId = 'automation-456';

    const options = { platform: 'ios' as const };

    const scope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/automations`, {
        name: 'releases',
        platform: 'ios',
        triggerType: 'tag',
      })
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(201, { id: automationId, name: 'releases' });

    mockPromptOrganizationSelection.mockResolvedValueOnce(orgId);
    mockPromptAppSelection.mockResolvedValueOnce(appId);
    mockPrompt
      .mockResolvedValueOnce('releases') // name
      .mockResolvedValueOnce('tag'); // trigger type

    await createAutomationCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockPrompt).toHaveBeenCalledWith('Enter the name of the automation:', { type: 'text' });
    expect(mockPrompt).toHaveBeenCalledWith('Select what triggers the automation:', {
      type: 'select',
      options: [
        { label: 'Branch', value: 'branch' },
        { label: 'Tag', value: 'tag' },
      ],
    });
    expect(mockConsola.success).toHaveBeenCalledWith('Automation created successfully.');
  });

  it('should derive the platform from the app type when not provided', async () => {
    const appId = 'app-123';
    const automationId = 'automation-456';

    const options = { appId, name: 'nightly', triggerType: 'branch' as const };

    const appScope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}`)
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(200, { id: appId, type: 'android' });
    const createScope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/automations`, {
        name: 'nightly',
        platform: 'android',
        triggerType: 'branch',
      })
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(201, { id: automationId, name: 'nightly' });

    await createAutomationCommand.action(options, undefined);

    expect(appScope.isDone()).toBe(true);
    expect(createScope.isDone()).toBe(true);
    expect(mockConsola.success).toHaveBeenCalledWith('Automation created successfully.');
  });

  it('should handle API error', async () => {
    const appId = 'app-123';

    const options = {
      appId,
      name: 'nightly',
      platform: 'android' as const,
      triggerType: 'branch' as const,
    };

    const scope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/automations`)
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(400, { message: 'Automation with this name already exists.' });

    await expect(createAutomationCommand.action(options, undefined)).rejects.toThrow();

    expect(scope.isDone()).toBe(true);
    expect(mockConsola.success).not.toHaveBeenCalled();
  });
});
