import { DEFAULT_API_BASE_URL } from '@/config/consts.js';
import authorizationService from '@/services/authorization-service.js';
import { prompt } from '@/utils/prompt.js';
import userConfig from '@/utils/userConfig.js';
import consola from 'consola';
import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import updateBundleCommand from './update.js';

// Mock dependencies
vi.mock('@/utils/userConfig.js');
vi.mock('@/utils/prompt.js');
vi.mock('@/services/authorization-service.js');
vi.mock('consola');

describe('apps-bundles-update', () => {
  const mockUserConfig = vi.mocked(userConfig);
  const mockPrompt = vi.mocked(prompt);
  const mockConsola = vi.mocked(consola);
  const mockAuthorizationService = vi.mocked(authorizationService);

  beforeEach(() => {
    vi.clearAllMocks();

    mockUserConfig.read.mockReturnValue({ token: 'test-token' });
    mockAuthorizationService.hasAuthorizationToken.mockReturnValue(true);
    mockAuthorizationService.getCurrentAuthorizationToken.mockReturnValue('test-token');

    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
  });

  it('should require authentication', async () => {
    const appId = 'app-123';
    const bundleId = 'bundle-456';

    const options = { appId, bundleId };

    mockAuthorizationService.hasAuthorizationToken.mockReturnValue(false);

    await updateBundleCommand.action(options, undefined);

    expect(mockConsola.error).toHaveBeenCalledWith('You must be logged in to run this command.');
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should update bundle with provided options', async () => {
    const appId = 'app-123';
    const bundleId = 'bundle-456';
    const rollout = 0.5;
    const androidMax = '1000';
    const iosMin = '2.0.0';
    const testToken = 'test-token';

    const options = { appId, bundleId, rollout, androidMax, iosMin };

    const scope = nock(DEFAULT_API_BASE_URL)
      .patch(`/v1/apps/${appId}/bundles/${bundleId}`, {
        appId,
        appBundleId: bundleId,
        maxAndroidAppVersionCode: androidMax,
        maxIosAppVersionCode: undefined,
        minAndroidAppVersionCode: undefined,
        minIosAppVersionCode: iosMin,
        rolloutPercentage: rollout,
      })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, { id: bundleId });

    await updateBundleCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockConsola.success).toHaveBeenCalledWith('Bundle updated successfully.');
  });

  it('should prompt for app selection when appId not provided', async () => {
    const orgId = 'org-1';
    const appId = 'app-1';
    const bundleId = 'bundle-456';
    const testToken = 'test-token';
    const organization = { id: orgId, name: 'Org 1' };
    const app = { id: appId, name: 'App 1' };

    const options = { bundleId, rollout: 1 };

    const orgsScope = nock(DEFAULT_API_BASE_URL)
      .get('/v1/organizations')
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, [organization]);

    const appsScope = nock(DEFAULT_API_BASE_URL)
      .get('/v1/apps')
      .query({ organizationId: orgId })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, [app]);

    const updateScope = nock(DEFAULT_API_BASE_URL)
      .patch(`/v1/apps/${appId}/bundles/${bundleId}`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, { id: bundleId });

    mockPrompt
      .mockResolvedValueOnce(orgId) // organization selection
      .mockResolvedValueOnce(appId); // app selection

    await updateBundleCommand.action(options, undefined);

    expect(orgsScope.isDone()).toBe(true);
    expect(appsScope.isDone()).toBe(true);
    expect(updateScope.isDone()).toBe(true);
    expect(mockConsola.success).toHaveBeenCalledWith('Bundle updated successfully.');
  });

  it('should prompt for bundleId when not provided', async () => {
    const appId = 'app-123';
    const bundleId = 'bundle-456';
    const testToken = 'test-token';

    const options = { appId };

    const scope = nock(DEFAULT_API_BASE_URL)
      .patch(`/v1/apps/${appId}/bundles/${bundleId}`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, { id: bundleId });

    mockPrompt.mockResolvedValueOnce(bundleId); // bundle ID input

    await updateBundleCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockPrompt).toHaveBeenCalledWith('Enter the bundle ID:', { type: 'text' });
    expect(mockConsola.success).toHaveBeenCalledWith('Bundle updated successfully.');
  });

  it('should handle API error during update', async () => {
    const appId = 'app-123';
    const bundleId = 'bundle-456';
    const testToken = 'test-token';

    const options = { appId, bundleId };

    const scope = nock(DEFAULT_API_BASE_URL)
      .patch(`/v1/apps/${appId}/bundles/${bundleId}`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(404, { message: 'Bundle not found' });

    await updateBundleCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockConsola.error).toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(1);
  });

  it('should handle error when no organizations exist', async () => {
    const testToken = 'test-token';

    const options = {};

    const scope = nock(DEFAULT_API_BASE_URL)
      .get('/v1/organizations')
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, []);

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit called with code ${code}`);
    });

    try {
      await updateBundleCommand.action(options, undefined);
    } catch (error: any) {
      expect(error.message).toBe('process.exit called with code 1');
    }

    expect(scope.isDone()).toBe(true);
    expect(mockConsola.error).toHaveBeenCalledWith('You must create an organization before updating a bundle.');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
