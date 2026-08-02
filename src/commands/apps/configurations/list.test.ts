import { DEFAULT_API_BASE_URL } from '@/config/consts.js';
import authorizationService from '@/services/authorization-service.js';
import { promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import userConfig from '@/utils/user-config.js';
import consola from 'consola';
import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import listConfigurationsCommand from './list.js';

// Mock dependencies
vi.mock('@/utils/user-config.js');
vi.mock('@/utils/prompt.js');
vi.mock('@/services/authorization-service.js');
vi.mock('consola');
vi.mock('@/utils/environment.js', () => ({
  isInteractive: () => true,
}));

describe('apps-configurations-list', () => {
  const mockUserConfig = vi.mocked(userConfig);
  const mockPromptOrganizationSelection = vi.mocked(promptOrganizationSelection);
  const mockPromptAppSelection = vi.mocked(promptAppSelection);
  const mockConsola = vi.mocked(consola);
  const mockAuthorizationService = vi.mocked(authorizationService);

  const configurations = [{ id: 'configuration-456', appId: 'app-123', name: 'production' }];

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

  it('should list configurations and display table format', async () => {
    const options = { appId: 'app-123' };

    const scope = nock(DEFAULT_API_BASE_URL)
      .get('/v1/apps/app-123/configurations')
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(200, configurations);

    await listConfigurationsCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(console.table).toHaveBeenCalledWith(configurations);
    expect(mockConsola.success).toHaveBeenCalledWith('Native configurations retrieved successfully.');
  });

  it('should output JSON when json flag is set', async () => {
    const options = { appId: 'app-123', json: true };

    const scope = nock(DEFAULT_API_BASE_URL)
      .get('/v1/apps/app-123/configurations')
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(200, configurations);

    await listConfigurationsCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(console.log).toHaveBeenCalledWith(JSON.stringify(configurations, null, 2));
    expect(mockConsola.success).not.toHaveBeenCalled();
  });

  it('should forward pagination options', async () => {
    const options = { appId: 'app-123', limit: 10, offset: 20 };

    const scope = nock(DEFAULT_API_BASE_URL)
      .get('/v1/apps/app-123/configurations')
      .query({ limit: '10', offset: '20' })
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(200, configurations);

    await listConfigurationsCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
  });

  it('should prompt for app when not provided', async () => {
    const orgId = 'org-1';
    const appId = 'app-1';

    const options = {};

    const scope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}/configurations`)
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(200, configurations);

    mockPromptOrganizationSelection.mockResolvedValueOnce(orgId);
    mockPromptAppSelection.mockResolvedValueOnce(appId);

    await listConfigurationsCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockConsola.success).toHaveBeenCalledWith('Native configurations retrieved successfully.');
  });

  it('should handle API error', async () => {
    const options = { appId: 'app-123' };

    const scope = nock(DEFAULT_API_BASE_URL)
      .get('/v1/apps/app-123/configurations')
      .matchHeader('Authorization', 'Bearer test-token')
      .reply(500, { message: 'Internal server error' });

    await expect(listConfigurationsCommand.action(options, undefined)).rejects.toThrow();

    expect(scope.isDone()).toBe(true);
  });
});
