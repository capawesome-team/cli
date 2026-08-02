import { DEFAULT_API_BASE_URL } from '@/config/consts.js';
import authorizationService from '@/services/authorization-service.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import userConfig from '@/utils/user-config.js';
import consola from 'consola';
import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import updateAutomationCommand from './update.js';

// Mock dependencies
vi.mock('@/utils/user-config.js');
vi.mock('@/utils/prompt.js');
vi.mock('@/services/authorization-service.js');
vi.mock('consola');
vi.mock('@/utils/environment.js', () => ({
  isInteractive: () => true,
}));

describe('apps-automations-update', () => {
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

  it('should update automation with provided options', async () => {
    const appId = 'app-123';
    const automationId = 'automation-456';

    const options = {
      appId,
      automationId,
      configuration: 'Production',
      name: 'renamed',
      triggerPattern: 'release/*',
    };

    const scope = nock(DEFAULT_API_BASE_URL)
      .patch(`/v1/apps/${appId}/automations/${automationId}`, {
        appConfigurationName: 'Production',
        name: 'renamed',
        triggerPattern: 'release/*',
      })
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(204);

    await updateAutomationCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockConsola.success).toHaveBeenCalledWith('Automation updated successfully.');
  });

  it('should clear a reference when an empty string is passed', async () => {
    const appId = 'app-123';
    const automationId = 'automation-456';

    const options = { appId, automationId, certificate: '', triggerPattern: '' };

    const scope = nock(DEFAULT_API_BASE_URL)
      .patch(`/v1/apps/${appId}/automations/${automationId}`, {
        appCertificateName: null,
        triggerPattern: null,
      })
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(204);

    await updateAutomationCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockConsola.success).toHaveBeenCalledWith('Automation updated successfully.');
  });

  it('should output JSON when json flag is set', async () => {
    const appId = 'app-123';
    const automationId = 'automation-456';

    const options = { appId, automationId, json: true, name: 'renamed' };

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const scope = nock(DEFAULT_API_BASE_URL)
      .patch(`/v1/apps/${appId}/automations/${automationId}`, { name: 'renamed' })
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(204);

    await updateAutomationCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({ id: automationId }, null, 2));
    expect(mockConsola.success).not.toHaveBeenCalled();
  });

  it('should prompt for app and automation when not provided', async () => {
    const orgId = 'org-1';
    const appId = 'app-1';
    const automationId = 'automation-456';

    const options = { name: 'renamed' };

    const listScope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}/automations`)
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(200, [{ id: automationId, appId, name: 'nightly' }]);
    const updateScope = nock(DEFAULT_API_BASE_URL)
      .patch(`/v1/apps/${appId}/automations/${automationId}`, { name: 'renamed' })
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(204);

    mockPromptOrganizationSelection.mockResolvedValueOnce(orgId);
    mockPromptAppSelection.mockResolvedValueOnce(appId);
    mockPrompt.mockResolvedValueOnce(automationId);

    await updateAutomationCommand.action(options, undefined);

    expect(listScope.isDone()).toBe(true);
    expect(updateScope.isDone()).toBe(true);
    expect(mockPrompt).toHaveBeenCalledWith('Select the automation to update:', {
      type: 'select',
      options: [{ label: 'nightly', value: automationId }],
    });
  });

  it('should handle API error', async () => {
    const appId = 'app-123';
    const automationId = 'automation-456';

    const options = { appId, automationId, certificate: 'Missing' };

    const scope = nock(DEFAULT_API_BASE_URL)
      .patch(`/v1/apps/${appId}/automations/${automationId}`)
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(400, { message: 'Certificate with name "Missing" not found for platform "android".' });

    await expect(updateAutomationCommand.action(options, undefined)).rejects.toThrow();

    expect(scope.isDone()).toBe(true);
    expect(mockConsola.success).not.toHaveBeenCalled();
  });
});
