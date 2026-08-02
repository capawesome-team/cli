import { DEFAULT_API_BASE_URL } from '@/config/consts.js';
import authorizationService from '@/services/authorization-service.js';
import { promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import userConfig from '@/utils/user-config.js';
import consola from 'consola';
import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import listAutomationsCommand from './list.js';

// Mock dependencies
vi.mock('@/utils/user-config.js');
vi.mock('@/utils/prompt.js');
vi.mock('@/services/authorization-service.js');
vi.mock('consola');
vi.mock('@/utils/environment.js', () => ({
  isInteractive: () => true,
}));

describe('apps-automations-list', () => {
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

  it('should list automations', async () => {
    const appId = 'app-123';
    const automations = [{ id: 'automation-1', appId, name: 'nightly' }];

    const options = { appId };

    const tableSpy = vi.spyOn(console, 'table').mockImplementation(() => {});

    const scope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}/automations`)
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(200, automations);

    await listAutomationsCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(tableSpy).toHaveBeenCalledWith(automations);
    expect(mockConsola.success).toHaveBeenCalledWith('Automations retrieved successfully.');
  });

  it('should pass pagination and platform filters', async () => {
    const appId = 'app-123';

    const options = { appId, limit: 5, offset: 10, platform: 'ios' as const };

    vi.spyOn(console, 'table').mockImplementation(() => {});

    const scope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}/automations`)
      .query({ limit: '5', offset: '10', platform: 'ios' })
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(200, []);

    await listAutomationsCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
  });

  it('should output JSON when json flag is set', async () => {
    const appId = 'app-123';
    const automations = [{ id: 'automation-1', appId, name: 'nightly' }];

    const options = { appId, json: true };

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const scope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}/automations`)
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(200, automations);

    await listAutomationsCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify(automations, null, 2));
    expect(mockConsola.success).not.toHaveBeenCalled();
  });

  it('should prompt for app when not provided', async () => {
    const orgId = 'org-1';
    const appId = 'app-1';

    const options = {};

    vi.spyOn(console, 'table').mockImplementation(() => {});

    const scope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}/automations`)
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(200, []);

    mockPromptOrganizationSelection.mockResolvedValueOnce(orgId);
    mockPromptAppSelection.mockResolvedValueOnce(appId);

    await listAutomationsCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockPromptOrganizationSelection).toHaveBeenCalled();
    expect(mockPromptAppSelection).toHaveBeenCalledWith(orgId);
  });
});
