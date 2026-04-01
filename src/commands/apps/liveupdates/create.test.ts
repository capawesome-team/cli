import { DEFAULT_API_BASE_URL, DEFAULT_CONSOLE_BASE_URL } from '@/config/consts.js';
import authorizationService from '@/services/authorization-service.js';
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

describe('apps-liveupdates-create', () => {
  const mockUserConfig = vi.mocked(userConfig);
  const mockAuthorizationService = vi.mocked(authorizationService);
  const mockConsola = vi.mocked(consola);

  const testToken = 'test-token';
  const appId = '00000000-0000-0000-0000-000000000001';
  const buildId = '00000000-0000-0000-0000-000000000002';
  const deploymentId = '00000000-0000-0000-0000-000000000003';

  beforeEach(async () => {
    vi.clearAllMocks();

    mockUserConfig.read.mockReturnValue({ token: testToken });
    mockAuthorizationService.hasAuthorizationToken.mockReturnValue(true);
    mockAuthorizationService.getCurrentAuthorizationToken.mockReturnValue(testToken);

    // Mock waitForJobCompletion to resolve immediately
    const jobUtils = await import('@/utils/job.js');
    vi.mocked(jobUtils.waitForJobCompletion).mockResolvedValue({
      id: 'job-1',
      status: 'succeeded',
      createdAt: '2024-01-01T00:00:00Z',
    });

    vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
      throw new Error(`Process exited with code ${code}`);
    });

    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
  });

  it('should require authentication', async () => {
    mockAuthorizationService.hasAuthorizationToken.mockReturnValue(false);

    const options = { appId, gitRef: 'main', channel: 'production' };

    await expect(createCommand.action(options, undefined)).rejects.toThrow('Process exited with code 1');

    expect(mockConsola.error).toHaveBeenCalledWith(
      'You must be logged in to run this command. Set the `CAPAWESOME_TOKEN` environment variable or use the `--token` option.',
    );
  });

  it('should create a live update with build and deployment', async () => {
    const options = {
      appId,
      gitRef: 'main',
      channel: 'production',
      yes: true,
    };

    const buildScope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/builds`, {
        gitRef: 'main',
        platform: 'web',
      })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: buildId, jobId: 'job-1', numberAsString: '1' });

    const deploymentScope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/deployments`, {
        appId,
        appBuildId: buildId,
        appChannelName: 'production',
        rolloutPercentage: 1,
      })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: deploymentId });

    await createCommand.action(options, undefined);

    expect(buildScope.isDone()).toBe(true);
    expect(deploymentScope.isDone()).toBe(true);
    expect(mockConsola.success).toHaveBeenCalledWith('Build created successfully.');
    expect(mockConsola.success).toHaveBeenCalledWith('Build completed successfully.');
    expect(mockConsola.success).toHaveBeenCalledWith('Deployment created successfully.');
    expect(mockConsola.info).toHaveBeenCalledWith(`Build ID: ${buildId}`);
    expect(mockConsola.info).toHaveBeenCalledWith(`Deployment ID: ${deploymentId}`);
  });

  it('should pass environment and certificate to build', async () => {
    const options = {
      appId,
      gitRef: 'v1.0.0',
      channel: 'production',
      environment: 'staging',
      certificate: 'my-cert',
      yes: true,
    };

    const buildScope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/builds`, {
        gitRef: 'v1.0.0',
        platform: 'web',
        appEnvironmentName: 'staging',
        appCertificateName: 'my-cert',
      })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: buildId, jobId: 'job-1', numberAsString: '1' });

    const deploymentScope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/deployments`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: deploymentId });

    await createCommand.action(options, undefined);

    expect(buildScope.isDone()).toBe(true);
    expect(deploymentScope.isDone()).toBe(true);
  });

  it('should pass stack to build', async () => {
    const options = {
      appId,
      gitRef: 'main',
      channel: 'production',
      stack: 'macos-tahoe' as const,
      yes: true,
    };

    const buildScope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/builds`, {
        gitRef: 'main',
        platform: 'web',
        stack: 'macos-tahoe',
      })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: buildId, jobId: 'job-1', numberAsString: '1' });

    const deploymentScope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/deployments`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: deploymentId });

    await createCommand.action(options, undefined);

    expect(buildScope.isDone()).toBe(true);
    expect(deploymentScope.isDone()).toBe(true);
  });

  it('should update version constraints when provided', async () => {
    const options = {
      appId,
      gitRef: 'main',
      channel: 'production',
      androidMin: '10',
      androidMax: '50',
      iosEq: '42',
      yes: true,
    };

    const buildScope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/builds`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: buildId, jobId: 'job-1', numberAsString: '1' });

    const updateScope = nock(DEFAULT_API_BASE_URL)
      .patch(`/v1/apps/${appId}/builds/${buildId}`, {
        minAndroidAppVersionCode: '10',
        maxAndroidAppVersionCode: '50',
        eqIosAppVersionCode: '42',
      })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, { id: buildId });

    const deploymentScope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/deployments`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: deploymentId });

    await createCommand.action(options, undefined);

    expect(buildScope.isDone()).toBe(true);
    expect(updateScope.isDone()).toBe(true);
    expect(deploymentScope.isDone()).toBe(true);
    expect(mockConsola.success).toHaveBeenCalledWith('Build updated successfully.');
  });

  it('should convert rollout percentage to decimal', async () => {
    const options = {
      appId,
      gitRef: 'main',
      channel: 'production',
      rolloutPercentage: 50,
      yes: true,
    };

    const buildScope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/builds`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: buildId, jobId: 'job-1', numberAsString: '1' });

    const deploymentScope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/deployments`, {
        appId,
        appBuildId: buildId,
        appChannelName: 'production',
        rolloutPercentage: 0.5,
      })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: deploymentId });

    await createCommand.action(options, undefined);

    expect(buildScope.isDone()).toBe(true);
    expect(deploymentScope.isDone()).toBe(true);
  });

  it('should output JSON when json flag is set', async () => {
    const options = {
      appId,
      gitRef: 'main',
      channel: 'production',
      json: true,
      yes: true,
    };

    nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/builds`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: buildId, jobId: 'job-1', numberAsString: '42' });

    nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/deployments`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: deploymentId });

    await createCommand.action(options, undefined);

    expect(console.log).toHaveBeenCalledWith(
      JSON.stringify(
        {
          buildId,
          buildNumberAsString: '42',
          deploymentId,
        },
        null,
        2,
      ),
    );
  });

  it('should require app ID in non-interactive mode', async () => {
    const options = { gitRef: 'main', channel: 'production' };

    await expect(createCommand.action(options, undefined)).rejects.toThrow('Process exited with code 1');

    expect(mockConsola.error).toHaveBeenCalledWith(
      'You must provide an app ID when running in non-interactive environment.',
    );
  });

  it('should require git ref in non-interactive mode', async () => {
    const options = { appId, channel: 'production' };

    await expect(createCommand.action(options, undefined)).rejects.toThrow('Process exited with code 1');

    expect(mockConsola.error).toHaveBeenCalledWith(
      'You must provide a git ref when running in non-interactive environment.',
    );
  });

  it('should require channel in non-interactive mode', async () => {
    const options = { appId, gitRef: 'main' };

    await expect(createCommand.action(options, undefined)).rejects.toThrow('Process exited with code 1');

    expect(mockConsola.error).toHaveBeenCalledWith(
      'You must provide a channel when running in non-interactive environment.',
    );
  });

  it('should handle build creation API error', async () => {
    const options = {
      appId,
      gitRef: 'main',
      channel: 'production',
      yes: true,
    };

    const buildScope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/builds`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(400, { message: 'Invalid build data' });

    await expect(createCommand.action(options, undefined)).rejects.toThrow();

    expect(buildScope.isDone()).toBe(true);
  });

  it('should include build URL in output', async () => {
    const options = {
      appId,
      gitRef: 'main',
      channel: 'production',
      yes: true,
    };

    nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/builds`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: buildId, jobId: 'job-1', numberAsString: '1' });

    nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/deployments`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: deploymentId });

    await createCommand.action(options, undefined);

    expect(mockConsola.info).toHaveBeenCalledWith(
      `Build URL: ${DEFAULT_CONSOLE_BASE_URL}/apps/${appId}/builds/${buildId}`,
    );
    expect(mockConsola.info).toHaveBeenCalledWith(
      `Deployment URL: ${DEFAULT_CONSOLE_BASE_URL}/apps/${appId}/deployments/${deploymentId}`,
    );
  });
});
