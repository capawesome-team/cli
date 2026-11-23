import { DEFAULT_API_BASE_URL } from '@/config/consts.js';
import authorizationService from '@/services/authorization-service.js';
import userConfig from '@/utils/user-config.js';
import consola from 'consola';
import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import probeDeviceCommand from './probe.js';

// Mock dependencies
vi.mock('@/utils/user-config.js');
vi.mock('@/utils/prompt.js');
vi.mock('@/services/authorization-service.js');
vi.mock('consola');
vi.mock('@/utils/environment.js', () => ({
  isInteractive: () => true,
}));

describe('apps-devices-probe', () => {
  const mockUserConfig = vi.mocked(userConfig);
  const mockConsola = vi.mocked(consola);
  const mockAuthorizationService = vi.mocked(authorizationService);

  const appId = 'app-123';
  const deviceId = 'device-456';
  const bundleId = 'bundle-789';
  const testToken = 'test-token';

  const mockProbeRequest = (probe: object) =>
    nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}/devices/${deviceId}/probe`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, probe);

  beforeEach(() => {
    vi.clearAllMocks();

    mockUserConfig.read.mockReturnValue({ token: testToken });
    mockAuthorizationService.getCurrentAuthorizationToken.mockReturnValue(testToken);
    mockAuthorizationService.hasAuthorizationToken.mockReturnValue(true);

    vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
      throw new Error(`Process exited with code ${code}`);
    });
  });

  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
  });

  it('should report up to date when the device already runs the latest bundle', async () => {
    const probeScope = mockProbeRequest({
      bundle: null,
      channelName: 'production',
      reason: null,
      result: 'up_to_date',
    });

    await probeDeviceCommand.action({ appId, deviceId }, undefined);

    expect(probeScope.isDone()).toBe(true);
    expect(mockConsola.info).toHaveBeenCalledWith('This device is up to date.');
    expect(mockConsola.success).not.toHaveBeenCalled();
  });

  it('should output the probe with the bundle id on top when json flag is set', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const probe = { bundle: { id: bundleId }, channelName: 'production', reason: null, result: 'available' };
    const probeScope = mockProbeRequest(probe);

    await probeDeviceCommand.action({ appId, deviceId, json: true }, undefined);

    expect(probeScope.isDone()).toBe(true);
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify({ ...probe, bundleId }, null, 2));
    expect(mockConsola.info).not.toHaveBeenCalled();
  });
});
