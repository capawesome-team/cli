import { DEFAULT_API_BASE_URL } from '@/config/consts.js';
import authorizationService from '@/services/authorization-service.js';
import { prompt, promptOrganizationSelection } from '@/utils/prompt.js';
import userConfig from '@/utils/user-config.js';
import consola from 'consola';
import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import createAppCommand from './create.js';

// Mock dependencies
vi.mock('@/utils/user-config.js');
vi.mock('@/utils/prompt.js');
vi.mock('@/services/authorization-service.js');
vi.mock('consola');
vi.mock('@/utils/environment.js', () => ({
  isInteractive: () => true,
}));

describe('apps-create', () => {
  const mockUserConfig = vi.mocked(userConfig);
  const mockPrompt = vi.mocked(prompt);
  const mockPromptOrganizationSelection = vi.mocked(promptOrganizationSelection);
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

  it('should create app with provided options', async () => {
    const appName = 'Test App';
    const organizationId = 'org-123';
    const appId = 'app-456';
    const testToken = 'test-token';

    const options = { name: appName, organizationId };

    const scope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps?organizationId=${organizationId}`, { name: appName })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: appId, name: appName });

    await createAppCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockConsola.success).toHaveBeenCalledWith('App created successfully.');
    expect(mockConsola.info).toHaveBeenCalledWith(`App ID: ${appId}`);
  });

  it('should prompt for organization when not provided', async () => {
    const appName = 'Test App';
    const orgId = 'org-1';
    const appId = 'app-456';
    const testToken = 'test-token';

    const options = { name: appName };

    const createScope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps?organizationId=${orgId}`, { name: appName })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: appId, name: appName });

    mockPromptOrganizationSelection.mockResolvedValueOnce(orgId);

    await createAppCommand.action(options, undefined);

    expect(createScope.isDone()).toBe(true);
    expect(mockPromptOrganizationSelection).toHaveBeenCalled();
    expect(mockConsola.success).toHaveBeenCalledWith('App created successfully.');
  });

  it('should prompt for app name when not provided', async () => {
    const organizationId = 'org-123';
    const promptedAppName = 'Prompted App';
    const appId = 'app-456';
    const testToken = 'test-token';

    const options = { organizationId };

    const scope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps?organizationId=${organizationId}`, { name: promptedAppName })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: appId, name: promptedAppName });

    mockPrompt.mockResolvedValueOnce(promptedAppName);

    await createAppCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockPrompt).toHaveBeenCalledWith('Enter the name of the app:', { type: 'text' });
  });

  it('should exit when promptOrganizationSelection exits', async () => {
    const options = { name: 'Test App' };

    mockPromptOrganizationSelection.mockImplementation(() => {
      process.exit(1);
      return Promise.resolve('');
    });

    await expect(createAppCommand.action(options, undefined)).rejects.toThrow('Process exited with code 1');
  });

  it('should handle API error during creation', async () => {
    const appName = 'Test App';
    const organizationId = 'org-123';
    const testToken = 'test-token';

    const options = { name: appName, organizationId };

    const scope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps?organizationId=${organizationId}`, { name: appName })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(400, { message: 'App name already exists' });

    await expect(createAppCommand.action(options, undefined)).rejects.toThrow();

    expect(scope.isDone()).toBe(true);
  });
});
