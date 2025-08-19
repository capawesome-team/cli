import { DEFAULT_API_BASE_URL } from '@/config/consts.js';
import authorizationService from '@/services/authorization-service.js';
import { prompt } from '@/utils/prompt.js';
import userConfig from '@/utils/userConfig.js';
import consola from 'consola';
import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import createAppCommand from './create.js';

// Mock dependencies
vi.mock('@/utils/userConfig.js');
vi.mock('@/utils/prompt.js');
vi.mock('@/services/authorization-service.js');
vi.mock('consola');

describe('apps-create', () => {
  const mockUserConfig = vi.mocked(userConfig);
  const mockPrompt = vi.mocked(prompt);
  const mockConsola = vi.mocked(consola);
  const mockAuthorizationService = vi.mocked(authorizationService);

  beforeEach(() => {
    vi.clearAllMocks();

    mockUserConfig.read.mockReturnValue({ token: 'test-token' });
    mockAuthorizationService.getCurrentAuthorizationToken.mockReturnValue('test-token');

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
    const orgId1 = 'org-1';
    const orgId2 = 'org-2';
    const appId = 'app-456';
    const testToken = 'test-token';
    const organizations = [
      { id: orgId1, name: 'Org 1' },
      { id: orgId2, name: 'Org 2' },
    ];

    const options = { name: appName };

    const orgsScope = nock(DEFAULT_API_BASE_URL)
      .get('/v1/organizations')
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, organizations);

    const createScope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps?organizationId=${orgId1}`, { name: appName })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: appId, name: appName });

    mockPrompt.mockResolvedValueOnce(orgId1);

    await createAppCommand.action(options, undefined);

    expect(orgsScope.isDone()).toBe(true);
    expect(createScope.isDone()).toBe(true);
    expect(mockPrompt).toHaveBeenCalledWith('Which organization do you want to create the app in?', {
      type: 'select',
      options: [
        { label: 'Org 1', value: orgId1 },
        { label: 'Org 2', value: orgId2 },
      ],
    });
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

  it('should handle error when no organizations exist', async () => {
    const appName = 'Test App';
    const testToken = 'test-token';

    const options = { name: appName };

    const scope = nock(DEFAULT_API_BASE_URL)
      .get('/v1/organizations')
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, []);

    await expect(createAppCommand.action(options, undefined)).rejects.toThrow('Process exited with code 1');

    expect(scope.isDone()).toBe(true);
    expect(mockConsola.error).toHaveBeenCalledWith('You must create an organization before creating an app.');
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
