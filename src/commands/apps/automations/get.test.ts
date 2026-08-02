import { DEFAULT_API_BASE_URL } from '@/config/consts.js';
import authorizationService from '@/services/authorization-service.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import userConfig from '@/utils/user-config.js';
import consola from 'consola';
import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import getAutomationCommand from './get.js';

// Mock dependencies
vi.mock('@/utils/user-config.js');
vi.mock('@/utils/prompt.js');
vi.mock('@/services/authorization-service.js');
vi.mock('consola');
vi.mock('@/utils/environment.js', () => ({
  isInteractive: () => true,
}));

describe('apps-automations-get', () => {
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

  it('should get automation by ID', async () => {
    const appId = 'app-123';
    const automationId = 'automation-456';
    const automation = { id: automationId, appId, name: 'nightly' };

    const options = { appId, automationId };

    const tableSpy = vi.spyOn(console, 'table').mockImplementation(() => {});

    const scope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}/automations/${automationId}`)
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(200, automation);

    await getAutomationCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(tableSpy).toHaveBeenCalledWith(automation);
    expect(mockConsola.success).toHaveBeenCalledWith('Automation retrieved successfully.');
  });

  it('should get automation by name', async () => {
    const appId = 'app-123';
    const automation = { id: 'automation-456', appId, name: 'nightly' };

    const options = { appId, name: 'nightly' };

    vi.spyOn(console, 'table').mockImplementation(() => {});

    const scope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}/automations`)
      .query({ name: 'nightly' })
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(200, [automation]);

    await getAutomationCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockConsola.success).toHaveBeenCalledWith('Automation retrieved successfully.');
  });

  it('should output JSON when json flag is set', async () => {
    const appId = 'app-123';
    const automationId = 'automation-456';
    const automation = { id: automationId, appId, name: 'nightly' };

    const options = { appId, automationId, json: true };

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const scope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}/automations/${automationId}`)
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(200, automation);

    await getAutomationCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify(automation, null, 2));
    expect(mockConsola.success).not.toHaveBeenCalled();
  });

  it('should prompt for app and automation when not provided', async () => {
    const orgId = 'org-1';
    const appId = 'app-1';
    const automationId = 'automation-456';

    const options = {};

    vi.spyOn(console, 'table').mockImplementation(() => {});

    const listScope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}/automations`)
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(200, [{ id: automationId, appId, name: 'nightly' }]);
    const getScope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}/automations/${automationId}`)
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(200, { id: automationId, appId, name: 'nightly' });

    mockPromptOrganizationSelection.mockResolvedValueOnce(orgId);
    mockPromptAppSelection.mockResolvedValueOnce(appId);
    mockPrompt.mockResolvedValueOnce(automationId);

    await getAutomationCommand.action(options, undefined);

    expect(listScope.isDone()).toBe(true);
    expect(getScope.isDone()).toBe(true);
    expect(mockPrompt).toHaveBeenCalledWith('Select the automation:', {
      type: 'select',
      options: [{ label: 'nightly', value: automationId }],
    });
  });

  it('should exit when no automation matches the name', async () => {
    const appId = 'app-123';

    const options = { appId, name: 'missing' };

    const scope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}/automations`)
      .query({ name: 'missing' })
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(200, []);

    await expect(getAutomationCommand.action(options, undefined)).rejects.toThrow();

    expect(scope.isDone()).toBe(true);
    expect(mockConsola.error).toHaveBeenCalledWith('Automation not found.');
  });
});
