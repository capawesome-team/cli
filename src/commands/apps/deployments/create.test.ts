import { DEFAULT_API_BASE_URL } from '@/config/consts.js';
import authorizationService from '@/services/authorization-service.js';
import configService from '@/services/config.js';
import userConfig from '@/utils/user-config.js';
import consola from 'consola';
import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import createCommand from './create.js';

// Mock dependencies
vi.mock('@/utils/user-config.js');
vi.mock('@/utils/prompt.js');
vi.mock('@/services/authorization-service.js');
vi.mock('@/utils/job.js');
vi.mock('consola');

vi.mock('@/utils/environment.js', () => ({
  isInteractive: () => false,
}));

describe('apps-deployments-create', () => {
  const mockUserConfig = vi.mocked(userConfig);
  const mockAuthorizationService = vi.mocked(authorizationService);
  const mockConsola = vi.mocked(consola);

  const testToken = 'test-token';
  const appId = '00000000-0000-0000-0000-000000000001';
  const buildId = '00000000-0000-0000-0000-000000000002';
  const deploymentId = 'deployment-1';

  beforeEach(() => {
    vi.clearAllMocks();

    mockUserConfig.read.mockReturnValue({ token: testToken });
    mockAuthorizationService.hasAuthorizationToken.mockReturnValue(true);
    mockAuthorizationService.getCurrentAuthorizationToken.mockReturnValue(testToken);

    vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
      throw new Error(`Process exited with code ${code}`);
    });
  });

  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
  });

  it('should send the release notes with the deployment', async () => {
    const options = {
      appId,
      buildId,
      destination: 'Google Play',
      detached: true,
      releaseNotes: 'Bug fixes',
      releaseNotesLocale: ['de-DE=Fehlerbehebungen'],
    };

    const buildScope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}/builds/${buildId}`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, { id: buildId, platform: 'android' });
    const deploymentScope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/deployments`, {
        appId,
        appBuildId: buildId,
        appDestinationName: 'Google Play',
        releaseNotes: { default: 'Bug fixes', 'de-DE': 'Fehlerbehebungen' },
      })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: deploymentId, jobId: 'job-1' });

    await createCommand.action(options, undefined);

    expect(buildScope.isDone()).toBe(true);
    expect(deploymentScope.isDone()).toBe(true);
    expect(mockConsola.success).toHaveBeenCalledWith('Deployment created successfully.');
  });

  it('should print the deployment url using the configured console base url', async () => {
    const consoleBaseUrl = 'https://console.example.com';
    const getValueForKey = configService.getValueForKey.bind(configService);
    vi.spyOn(configService, 'getValueForKey').mockImplementation((key) =>
      key === 'CONSOLE_BASE_URL' ? Promise.resolve(consoleBaseUrl) : getValueForKey(key),
    );
    const options = { appId, buildId, destination: 'Google Play', detached: true };

    nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}/builds/${buildId}`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, { id: buildId, platform: 'android' });
    nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/deployments`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: deploymentId, jobId: 'job-1' });

    await createCommand.action(options, undefined);

    expect(mockConsola.info).toHaveBeenCalledWith(
      `Deployment URL: ${consoleBaseUrl}/apps/${appId}/deployments/${deploymentId}`,
    );
  });

  it('should reject translated release notes without a default text', async () => {
    const options = { appId, buildId, destination: 'Google Play', releaseNotesLocale: ['de-DE=Fehlerbehebungen'] };

    await expect(createCommand.action(options, undefined)).rejects.toThrow('Process exited with code 1');

    expect(mockConsola.error).toHaveBeenCalledWith('Release notes require a default text (--release-notes).');
  });
});
