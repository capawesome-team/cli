import { DEFAULT_API_BASE_URL } from '@/config/consts.js';
import authorizationService from '@/services/authorization-service.js';
import userConfig from '@/utils/user-config.js';
import consola from 'consola';
import fs from 'fs/promises';
import nock from 'nock';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import downloadCommand from './download.js';

vi.mock('@/utils/user-config.js');
vi.mock('@/utils/prompt.js');
vi.mock('@/services/authorization-service.js');
vi.mock('consola');

vi.mock('@/utils/environment.js', () => ({
  isInteractive: () => false,
}));

describe('apps-builds-download', () => {
  const mockUserConfig = vi.mocked(userConfig);
  const mockAuthorizationService = vi.mocked(authorizationService);
  const mockConsola = vi.mocked(consola);

  const testToken = 'test-token';
  const appId = '00000000-0000-0000-0000-000000000001';
  const buildId = '00000000-0000-0000-0000-000000000002';
  const artifactId = 'artifact-1';
  const artifactContent = 'zipped app bundle';

  let outputDirectory: string;

  const mockSimulatorBuild = () =>
    nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}/builds/${buildId}`)
      .query({ relations: 'appBuildArtifacts,job' })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, {
        id: buildId,
        platform: 'ios',
        type: 'simulator',
        job: { status: 'succeeded' },
        appBuildArtifacts: [
          { id: 'artifact-0', status: 'ready', type: 'xcarchive' },
          { id: artifactId, status: 'ready', type: 'app' },
        ],
      });

  beforeEach(async () => {
    vi.clearAllMocks();

    mockUserConfig.read.mockReturnValue({ token: testToken });
    mockAuthorizationService.hasAuthorizationToken.mockReturnValue(true);
    mockAuthorizationService.getCurrentAuthorizationToken.mockReturnValue(testToken);

    vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
      throw new Error(`Process exited with code ${code}`);
    });

    outputDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'capawesome-cli-download-'));
  });

  afterEach(async () => {
    nock.cleanAll();
    vi.restoreAllMocks();
    await fs.rm(outputDirectory, { force: true, recursive: true });
  });

  it('should download the app artifact of an iOS simulator build with --app', async () => {
    const outputPath = path.join(outputDirectory, 'simulator.app.zip');
    const buildScope = mockSimulatorBuild();
    const downloadScope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}/builds/${buildId}/artifacts/${artifactId}/download`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, artifactContent);

    await downloadCommand.action({ appId, buildId, app: outputPath }, undefined);

    expect(buildScope.isDone()).toBe(true);
    expect(downloadScope.isDone()).toBe(true);
    expect(await fs.readFile(outputPath, 'utf-8')).toBe(artifactContent);
    expect(mockConsola.success).toHaveBeenCalledWith(`APP downloaded successfully: ${outputPath}`);
  });

  it('should write the app artifact to `<build-id>.app.zip` by default', async () => {
    vi.spyOn(process, 'cwd').mockReturnValue(outputDirectory);
    mockSimulatorBuild();
    nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}/builds/${buildId}/artifacts/${artifactId}/download`)
      .reply(200, artifactContent);

    await downloadCommand.action({ appId, buildId, app: true }, undefined);

    const outputPath = path.join(outputDirectory, `${buildId}.app.zip`);
    expect(await fs.readFile(outputPath, 'utf-8')).toBe(artifactContent);
  });

  it('should reject --zip for an iOS build', async () => {
    mockSimulatorBuild();

    await expect(downloadCommand.action({ appId, buildId, zip: true }, undefined)).rejects.toThrow(
      'Process exited with code 1',
    );

    expect(mockConsola.error).toHaveBeenCalledWith('The ZIP artifact is not available for iOS builds.');
  });
});
