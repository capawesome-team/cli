import { DEFAULT_API_BASE_URL } from '@/config/consts.js';
import authorizationService from '@/services/authorization-service.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import userConfig from '@/utils/user-config.js';
import consola from 'consola';
import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import deleteAutomationCommand from './delete.js';

// Mock dependencies
vi.mock('@/utils/user-config.js');
vi.mock('@/utils/prompt.js');
vi.mock('@/services/authorization-service.js');
vi.mock('consola');
vi.mock('@/utils/environment.js', () => ({
  isInteractive: () => true,
}));

describe('apps-automations-delete', () => {
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

  it('should delete automation by ID after confirmation', async () => {
    const appId = 'app-123';
    const automationId = 'automation-456';

    const options = { appId, automationId };

    mockPrompt.mockResolvedValueOnce(true); // confirmation

    const scope = nock(DEFAULT_API_BASE_URL)
      .delete(`/v1/apps/${appId}/automations/${automationId}`)
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(204);

    await deleteAutomationCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockPrompt).toHaveBeenCalledWith('Are you sure you want to delete this automation?', {
      type: 'confirm',
    });
    expect(mockConsola.success).toHaveBeenCalledWith('Automation deleted successfully.');
  });

  it('should delete automation by name when yes flag is set', async () => {
    const appId = 'app-123';
    const automationId = 'automation-456';

    const options = { appId, name: 'nightly', yes: true };

    const listScope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}/automations`)
      .query({ name: 'nightly' })
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(200, [{ id: automationId, appId, name: 'nightly' }]);
    const deleteScope = nock(DEFAULT_API_BASE_URL)
      .delete(`/v1/apps/${appId}/automations/${automationId}`)
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(204);

    await deleteAutomationCommand.action(options, undefined);

    expect(listScope.isDone()).toBe(true);
    expect(deleteScope.isDone()).toBe(true);
    expect(mockPrompt).not.toHaveBeenCalled();
    expect(mockConsola.success).toHaveBeenCalledWith('Automation deleted successfully.');
  });

  it('should exit when no automation matches the name', async () => {
    const appId = 'app-123';

    const options = { appId, name: 'missing', yes: true };

    const scope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}/automations`)
      .query({ name: 'missing' })
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(200, []);

    await expect(deleteAutomationCommand.action(options, undefined)).rejects.toThrow();

    expect(scope.isDone()).toBe(true);
    expect(mockConsola.error).toHaveBeenCalledWith("No automation found with name 'missing'.");
  });

  it('should not delete automation when confirmation is declined', async () => {
    const options = { appId: 'app-123', automationId: 'automation-456' };

    mockPrompt.mockResolvedValueOnce(false); // declined confirmation

    await deleteAutomationCommand.action(options, undefined);

    expect(mockConsola.success).not.toHaveBeenCalled();
  });

  it('should prompt for app and automation when not provided', async () => {
    const orgId = 'org-1';
    const appId = 'app-1';
    const automationId = 'automation-456';

    const options = {};

    const listScope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}/automations`)
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(200, [{ id: automationId, appId, name: 'nightly' }]);
    const deleteScope = nock(DEFAULT_API_BASE_URL)
      .delete(`/v1/apps/${appId}/automations/${automationId}`)
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(204);

    mockPromptOrganizationSelection.mockResolvedValueOnce(orgId);
    mockPromptAppSelection.mockResolvedValueOnce(appId);
    mockPrompt
      .mockResolvedValueOnce(automationId) // automation selection
      .mockResolvedValueOnce(true); // confirmation

    await deleteAutomationCommand.action(options, undefined);

    expect(listScope.isDone()).toBe(true);
    expect(deleteScope.isDone()).toBe(true);
    expect(mockPrompt).toHaveBeenCalledWith('Select the automation to delete:', {
      type: 'select',
      options: [{ label: 'nightly', value: automationId }],
    });
  });

  it('should handle API error', async () => {
    const appId = 'app-123';
    const automationId = 'automation-456';

    const options = { appId, automationId, yes: true };

    const scope = nock(DEFAULT_API_BASE_URL)
      .delete(`/v1/apps/${appId}/automations/${automationId}`)
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(404, { message: 'Automation not found.' });

    await expect(deleteAutomationCommand.action(options, undefined)).rejects.toThrow();

    expect(scope.isDone()).toBe(true);
  });
});
