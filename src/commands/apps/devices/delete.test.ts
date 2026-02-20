import { DEFAULT_API_BASE_URL } from '@/config/consts.js';
import authorizationService from '@/services/authorization-service.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import userConfig from '@/utils/user-config.js';
import consola from 'consola';
import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import deleteDeviceCommand from './delete.js';

// Mock dependencies
vi.mock('@/utils/user-config.js');
vi.mock('@/utils/prompt.js');
vi.mock('@/services/authorization-service.js');
vi.mock('consola');
vi.mock('@/utils/environment.js', () => ({
  isInteractive: () => true,
}));

describe('apps-devices-delete', () => {
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

    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
  });

  it('should delete device with provided appId and deviceId after confirmation', async () => {
    const appId = 'app-123';
    const deviceId = 'device-456';
    const testToken = 'test-token';

    const options = { appId, deviceId };

    mockPrompt.mockResolvedValueOnce(true); // confirmation

    const scope = nock(DEFAULT_API_BASE_URL)
      .delete(`/v1/apps/${appId}/devices/${deviceId}`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200);

    await deleteDeviceCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockPrompt).toHaveBeenCalledWith('Are you sure you want to delete this device?', {
      type: 'confirm',
    });
    expect(mockConsola.success).toHaveBeenCalledWith('Device deleted successfully.');
  });

  it('should not delete device when confirmation is declined', async () => {
    const appId = 'app-123';
    const deviceId = 'device-456';

    const options = { appId, deviceId };

    mockPrompt.mockResolvedValueOnce(false); // declined confirmation

    await deleteDeviceCommand.action(options, undefined);

    expect(mockPrompt).toHaveBeenCalledWith('Are you sure you want to delete this device?', {
      type: 'confirm',
    });
    expect(mockConsola.success).not.toHaveBeenCalled();
  });

  it('should prompt for app selection when appId not provided', async () => {
    const orgId = 'org-1';
    const appId = 'app-1';
    const deviceId = 'device-456';
    const testToken = 'test-token';

    const options = { deviceId };

    const deleteScope = nock(DEFAULT_API_BASE_URL)
      .delete(`/v1/apps/${appId}/devices/${deviceId}`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200);

    mockPromptOrganizationSelection.mockResolvedValueOnce(orgId);
    mockPromptAppSelection.mockResolvedValueOnce(appId);
    mockPrompt.mockResolvedValueOnce(true); // confirmation

    await deleteDeviceCommand.action(options, undefined);

    expect(deleteScope.isDone()).toBe(true);
    expect(mockConsola.success).toHaveBeenCalledWith('Device deleted successfully.');
  });

  it('should prompt for deviceId when not provided', async () => {
    const appId = 'app-123';
    const deviceId = 'device-456';
    const testToken = 'test-token';

    const options = { appId };

    const scope = nock(DEFAULT_API_BASE_URL)
      .delete(`/v1/apps/${appId}/devices/${deviceId}`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200);

    mockPrompt
      .mockResolvedValueOnce(deviceId) // device ID input
      .mockResolvedValueOnce(true); // confirmation

    await deleteDeviceCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockPrompt).toHaveBeenCalledWith('Enter the device ID:', { type: 'text' });
    expect(mockConsola.success).toHaveBeenCalledWith('Device deleted successfully.');
  });

  it('should exit when promptOrganizationSelection exits', async () => {
    const options = {};

    mockPromptOrganizationSelection.mockImplementation(() => {
      process.exit(1);
      return Promise.resolve('');
    });

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((code) => {
      throw new Error(`process.exit called with code ${code}`);
    });

    try {
      await deleteDeviceCommand.action(options, undefined);
    } catch (error: any) {
      expect(error.message).toBe('process.exit called with code 1');
    }

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it('should handle API error during deletion', async () => {
    const appId = 'app-123';
    const deviceId = 'device-456';
    const testToken = 'test-token';

    const options = { appId, deviceId };

    mockPrompt.mockResolvedValueOnce(true);

    const scope = nock(DEFAULT_API_BASE_URL)
      .delete(`/v1/apps/${appId}/devices/${deviceId}`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(404, { message: 'Device not found' });

    await expect(deleteDeviceCommand.action(options, undefined)).rejects.toThrow();

    expect(scope.isDone()).toBe(true);
  });
});
