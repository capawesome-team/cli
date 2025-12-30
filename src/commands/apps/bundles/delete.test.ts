import { DEFAULT_API_BASE_URL } from '@/config/consts.js';
import authorizationService from '@/services/authorization-service.js';
import { prompt } from '@/utils/prompt.js';
import userConfig from '@/utils/user-config.js';
import consola from 'consola';
import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import deleteBundleCommand from './delete.js';

// Mock dependencies
vi.mock('@/utils/user-config.js');
vi.mock('@/utils/prompt.js');
vi.mock('@/services/authorization-service.js');
vi.mock('consola');
vi.mock('@/utils/environment.js', () => ({
  isInteractive: () => true,
}));

describe('apps-bundles-delete', () => {
  const mockUserConfig = vi.mocked(userConfig);
  const mockPrompt = vi.mocked(prompt);
  const mockConsola = vi.mocked(consola);
  const mockAuthorizationService = vi.mocked(authorizationService);

  beforeEach(() => {
    vi.clearAllMocks();

    mockUserConfig.read.mockReturnValue({ token: 'test-token' });
    mockAuthorizationService.getCurrentAuthorizationToken.mockReturnValue('test-token');
    mockAuthorizationService.hasAuthorizationToken.mockReturnValue(true);

    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
  });

  it('should delete bundle with provided appId and bundleId after confirmation', async () => {
    const appId = 'app-123';
    const bundleId = 'bundle-456';
    const testToken = 'test-token';

    const options = { appId, bundleId };

    mockPrompt.mockResolvedValueOnce(true); // confirmation

    const scope = nock(DEFAULT_API_BASE_URL)
      .delete(`/v1/apps/${appId}/bundles/${bundleId}`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200);

    await deleteBundleCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockPrompt).toHaveBeenCalledWith('Are you sure you want to delete this bundle?', {
      type: 'confirm',
    });
    expect(mockConsola.success).toHaveBeenCalledWith('Bundle deleted successfully.');
  });

  it('should not delete bundle when confirmation is declined', async () => {
    const appId = 'app-123';
    const bundleId = 'bundle-456';

    const options = { appId, bundleId };

    mockPrompt.mockResolvedValueOnce(false); // declined confirmation

    await deleteBundleCommand.action(options, undefined);

    expect(mockPrompt).toHaveBeenCalledWith('Are you sure you want to delete this bundle?', {
      type: 'confirm',
    });
    expect(mockConsola.success).not.toHaveBeenCalled();
  });

  it('should prompt for app selection when appId not provided', async () => {
    const orgId = 'org-1';
    const appId = 'app-1';
    const bundleId = 'bundle-456';
    const testToken = 'test-token';
    const organization = { id: orgId, name: 'Org 1' };
    const app = { id: appId, name: 'App 1' };

    const options = { bundleId };

    const orgsScope = nock(DEFAULT_API_BASE_URL)
      .get('/v1/organizations')
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, [organization]);

    const appsScope = nock(DEFAULT_API_BASE_URL)
      .get('/v1/apps')
      .query({ organizationId: orgId })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, [app]);

    const deleteScope = nock(DEFAULT_API_BASE_URL)
      .delete(`/v1/apps/${appId}/bundles/${bundleId}`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200);

    mockPrompt
      .mockResolvedValueOnce(orgId) // organization selection
      .mockResolvedValueOnce(appId) // app selection
      .mockResolvedValueOnce(true); // confirmation

    await deleteBundleCommand.action(options, undefined);

    expect(orgsScope.isDone()).toBe(true);
    expect(appsScope.isDone()).toBe(true);
    expect(deleteScope.isDone()).toBe(true);
    expect(mockConsola.success).toHaveBeenCalledWith('Bundle deleted successfully.');
  });

  it('should prompt for bundleId when not provided', async () => {
    const appId = 'app-123';
    const bundleId = 'bundle-456';
    const testToken = 'test-token';

    const options = { appId };

    const scope = nock(DEFAULT_API_BASE_URL)
      .delete(`/v1/apps/${appId}/bundles/${bundleId}`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200);

    mockPrompt
      .mockResolvedValueOnce(bundleId) // bundle ID input
      .mockResolvedValueOnce(true); // confirmation

    await deleteBundleCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockPrompt).toHaveBeenCalledWith('Enter the bundle ID:', { type: 'text' });
    expect(mockConsola.success).toHaveBeenCalledWith('Bundle deleted successfully.');
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
      await deleteBundleCommand.action(options, undefined);
    } catch (error: any) {
      expect(error.message).toBe('process.exit called with code 1');
    }

    expect(scope.isDone()).toBe(true);
    expect(mockConsola.error).toHaveBeenCalledWith('You must create an organization before deleting a bundle.');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should handle API error during deletion', async () => {
    const appId = 'app-123';
    const bundleId = 'bundle-456';
    const testToken = 'test-token';

    const options = { appId, bundleId };

    mockPrompt.mockResolvedValueOnce(true);

    const scope = nock(DEFAULT_API_BASE_URL)
      .delete(`/v1/apps/${appId}/bundles/${bundleId}`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(404, { message: 'Bundle not found' });

    await expect(deleteBundleCommand.action(options, undefined)).rejects.toThrow();

    expect(scope.isDone()).toBe(true);
  });
});
