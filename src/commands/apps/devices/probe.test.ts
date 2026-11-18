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
  const device = {
    id: deviceId,
    appBuildArtifactId: bundleId,
    appChannel: null,
    appChannelId: null,
    appDeploymentId: null,
    appId,
    appVersionCode: '10',
    appVersionName: '1.0.0',
    country: null,
    customId: null,
    forcedAppChannelId: null,
    lastSeenAt: '2026-01-01T00:00:00.000Z',
    osVersion: '18.0',
    platform: 1,
    pluginVersion: '7.0.0',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
  const latestBundle = {
    artifactType: 'zip',
    bundleId,
    channelName: 'production',
    checksum: null,
    customProperties: null,
    signature: null,
    url: 'https://example.com/bundle.zip',
  };

  const app = { id: appId, name: 'Example App', organizationId: 'org-1', type: 'capacitor' };

  const mockAppRequest = () =>
    nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, app);

  const mockDeviceRequest = () =>
    nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}/devices/${deviceId}`)
      .query({ relations: 'appChannel' })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, device);

  const mockProbeRequest = () =>
    nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}/bundles/latest`)
      .query({
        appVersionCode: '10',
        appVersionName: '1.0.0',
        bundleId,
        deviceId,
        osVersion: '18.0',
        platform: '1',
        pluginVersion: '7.0.0',
        runtime: 'capacitor',
      })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, latestBundle);

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
    const appScope = mockAppRequest();
    const deviceScope = mockDeviceRequest();
    const probeScope = mockProbeRequest();

    await probeDeviceCommand.action({ appId, deviceId }, undefined);

    expect(appScope.isDone()).toBe(true);
    expect(deviceScope.isDone()).toBe(true);
    expect(probeScope.isDone()).toBe(true);
    expect(mockConsola.info).toHaveBeenCalledWith('This device is up to date.');
    expect(mockConsola.success).not.toHaveBeenCalled();
  });

  it('should output the latest bundle unchanged when json flag is set', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const appScope = mockAppRequest();
    const deviceScope = mockDeviceRequest();
    const probeScope = mockProbeRequest();

    await probeDeviceCommand.action({ appId, deviceId, json: true }, undefined);

    expect(appScope.isDone()).toBe(true);
    expect(deviceScope.isDone()).toBe(true);
    expect(probeScope.isDone()).toBe(true);
    expect(logSpy).toHaveBeenCalledWith(JSON.stringify(latestBundle, null, 2));
    expect(mockConsola.info).not.toHaveBeenCalled();
  });
});
