import { DEFAULT_API_BASE_URL } from '@/config/consts.js';
import authorizationService from '@/services/authorization-service.js';
import userConfig from '@/utils/user-config.js';
import zip from '@/utils/zip.js';
import consola from 'consola';
import fs from 'fs';
import nock from 'nock';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import importCommand from './import.js';

// Mock dependencies
vi.mock('@/utils/user-config.js');
vi.mock('@/utils/prompt.js');
vi.mock('@/services/authorization-service.js');
vi.mock('consola');
vi.mock('@/utils/environment.js', () => ({
  isInteractive: () => false,
}));

describe('apps-import', () => {
  const mockUserConfig = vi.mocked(userConfig);
  const mockAuthorizationService = vi.mocked(authorizationService);
  const organizationId = 'org-123';
  let fixtureDirectory: string;
  let exportFile: string;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockUserConfig.read.mockReturnValue({ token: 'test-token' });
    mockAuthorizationService.getCurrentAuthorizationToken.mockReturnValue('test-token');
    mockAuthorizationService.hasAuthorizationToken.mockReturnValue(true);

    vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
      throw new Error(`Process exited with code ${code}`);
    });
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'table').mockImplementation(() => undefined);

    fixtureDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'apps-import-test-'));
  });

  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
    fs.rmSync(fixtureDirectory, { recursive: true, force: true });
  });

  const writeExportFile = async (apps: { folder: string; files: Record<string, unknown> }[]): Promise<void> => {
    const exportDirectory = path.join(fixtureDirectory, 'export');
    for (const app of apps) {
      for (const [fileName, content] of Object.entries(app.files)) {
        const filePath = path.join(exportDirectory, 'apps', app.folder, fileName);
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        if (typeof content === 'string' || Buffer.isBuffer(content)) {
          fs.writeFileSync(filePath, content);
        } else {
          fs.writeFileSync(filePath, JSON.stringify(content));
        }
      }
    }
    const buffer = await zip.zipFolder(exportDirectory);
    exportFile = path.join(fixtureDirectory, 'export.zip');
    fs.writeFileSync(exportFile, buffer);
  };

  const getJsonOutput = (): any => {
    const jsonCall = consoleLogSpy.mock.calls.find((call: any[]) => {
      try {
        JSON.parse(call[0] as string);
        return true;
      } catch {
        return false;
      }
    });
    expect(jsonCall).toBeDefined();
    return JSON.parse(jsonCall?.[0] as string);
  };

  it('should import an app with all resources', async () => {
    await writeExportFile([
      {
        folder: 'My App-6668c18c',
        files: {
          'app-detail.json': { id: '6668c18c', name: 'My App', appType: 'capacitor' },
          'repo-association.json': {
            gitProvider: 'github',
            cloneUrl: 'https://github.com/robingenz/appflow-export-test.git',
          },
          'environments.json': [{ id: 1, name: 'Production', vars: { KEY: 'value' }, secrets: { API_KEY: 'secret' } }],
          'live-update-channels.json': [{ id: 'channel-uuid', name: 'Production' }],
          'native-configs.json': [
            { id: 2, name: 'Production', configs: { base: { name: 'My App', bundle_id: 'dev.example.app' } } },
          ],
          'native-build-automations.json': [
            {
              name: 'Android Release',
              gitBranch: 'main',
              platform: 'android',
              buildType: 'release',
              environmentId: 1,
              webhook: null,
              automationEnabled: false,
              nativeConfigId: 2,
              signingCertificateId: 3,
              destinationId: null,
            },
          ],
          'web-build-automations.json': [],
          'signing-certificates/android/Debug-3/android-signing-certificate.json': {
            id: 3,
            name: 'Debug',
            keystoreFile: 'keystore.jks',
            keystorePassword: 'test1234',
            keyAlias: 'key',
            keyPassword: 'test1234',
          },
          'signing-certificates/android/Debug-3/keystore.jks': Buffer.from('keystore'),
        },
      },
    ]);

    const appId = 'app-456';
    const scope = nock(DEFAULT_API_BASE_URL)
      .get('/v1/apps')
      .query({ organizationId, limit: 50, offset: 0 })
      .reply(200, [])
      .post('/v1/apps', { name: 'My App', type: 'capacitor' })
      .query({ organizationId })
      .reply(201, { id: appId, name: 'My App', type: 'capacitor' })
      .post(`/v1/apps/${appId}/certificates`)
      .reply(201, { id: 'certificate-1', name: 'Debug' })
      .post(`/v1/apps/${appId}/environments`, { appId, name: 'Production' })
      .reply(201, { id: 'environment-1', name: 'Production' })
      .post(`/v1/apps/${appId}/environments/environment-1/variables/set`, [{ key: 'KEY', value: 'value' }])
      .reply(200)
      .post(`/v1/apps/${appId}/environments/environment-1/secrets/set`, [{ key: 'API_KEY', value: 'secret' }])
      .reply(200)
      .get(`/v1/apps/${appId}/channels`)
      .reply(200, [])
      .post(`/v1/apps/${appId}/channels`, { appId, name: 'Production' })
      .reply(201, { id: 'channel-1', name: 'Production' })
      .post(`/v1/apps/${appId}/configurations`, {
        name: 'Production',
        displayName: 'My App',
        packageName: 'dev.example.app',
      })
      .reply(201, { id: 'configuration-1', name: 'Production' })
      .post(`/v1/apps/${appId}/automations`, (body) => {
        return (
          body.name === 'Android Release' &&
          body.platform === 'android' &&
          body.triggerType === 'branch' &&
          body.triggerPattern === 'main' &&
          body.buildType === 'release' &&
          body.enabled === false &&
          body.appCertificateName === 'Debug' &&
          body.appConfigurationName === 'Production' &&
          body.appEnvironmentName === 'Production'
        );
      })
      .reply(201, { id: 'automation-1', name: 'Android Release' })
      .put(`/v1/apps/${appId}/repository`, {
        ownerSlug: 'robingenz',
        provider: 'github',
        repositorySlug: 'appflow-export-test',
      })
      .reply(200, { id: appId });

    await importCommand.action({ file: exportFile, organizationId, json: true }, undefined);

    expect(scope.isDone()).toBe(true);
    const output = getJsonOutput();
    expect(output.dryRun).toBe(false);
    expect(output.apps).toHaveLength(1);
    expect(output.apps[0]).toMatchObject({
      id: appId,
      name: 'My App',
      sourceId: '6668c18c',
      sourceName: 'My App',
      created: { automations: 1, certificates: 1, channels: 1, configurations: 1, destinations: 0, environments: 1 },
      errors: [],
    });
    expect(output.apps[0].webUrl).toContain(appId);
  });

  it('should rename the app if the name is already taken', async () => {
    await writeExportFile([
      {
        folder: 'My App-6668c18c',
        files: { 'app-detail.json': { id: '6668c18c', name: 'My App', appType: 'capacitor' } },
      },
    ]);

    const scope = nock(DEFAULT_API_BASE_URL)
      .get('/v1/apps')
      .query({ organizationId, limit: 50, offset: 0 })
      .reply(200, [{ id: 'app-1', name: 'My App', type: 'capacitor' }])
      .post('/v1/apps', { name: 'My App (2)', type: 'capacitor' })
      .query({ organizationId })
      .reply(201, { id: 'app-789', name: 'My App (2)', type: 'capacitor' })
      .get('/v1/apps/app-789/channels')
      .reply(200, []);

    await importCommand.action({ file: exportFile, organizationId, json: true }, undefined);

    expect(scope.isDone()).toBe(true);
    const output = getJsonOutput();
    expect(output.apps[0].name).toBe('My App (2)');
    expect(output.apps[0].notes).toContainEqual(expect.stringContaining('`My App (2)`'));
  });

  it('should continue with the remaining resources if one fails', async () => {
    await writeExportFile([
      {
        folder: 'My App-6668c18c',
        files: {
          'app-detail.json': { id: '6668c18c', name: 'My App', appType: 'capacitor' },
          'environments.json': [{ id: 1, name: 'Production', vars: { KEY: 'value' }, secrets: null }],
          'live-update-channels.json': [{ id: 'channel-uuid', name: 'Production' }],
        },
      },
    ]);

    const appId = 'app-456';
    const scope = nock(DEFAULT_API_BASE_URL)
      .get('/v1/apps')
      .query({ organizationId, limit: 50, offset: 0 })
      .reply(200, [])
      .post('/v1/apps', { name: 'My App', type: 'capacitor' })
      .query({ organizationId })
      .reply(201, { id: appId, name: 'My App', type: 'capacitor' })
      .post(`/v1/apps/${appId}/environments`, { appId, name: 'Production' })
      .reply(400, { message: 'Bad Request' })
      .get(`/v1/apps/${appId}/channels`)
      .reply(200, [])
      .post(`/v1/apps/${appId}/channels`, { appId, name: 'Production' })
      .reply(201, { id: 'channel-1', name: 'Production' });

    await expect(importCommand.action({ file: exportFile, organizationId, json: true }, undefined)).rejects.toThrow(
      'Process exited with code 1',
    );

    expect(scope.isDone()).toBe(true);
    const output = getJsonOutput();
    expect(output.apps[0].created).toMatchObject({ channels: 1, environments: 0 });
    expect(output.apps[0].errors).toContainEqual(expect.stringContaining('Production'));
  });

  it('should not create any resources with the dry run option', async () => {
    await writeExportFile([
      {
        folder: 'My App-6668c18c',
        files: {
          'app-detail.json': { id: '6668c18c', name: 'My App', appType: 'capacitor' },
          'environments.json': [{ id: 1, name: 'Production', vars: { KEY: 'value' }, secrets: null }],
        },
      },
    ]);

    const scope = nock(DEFAULT_API_BASE_URL)
      .get('/v1/apps')
      .query({ organizationId, limit: 50, offset: 0 })
      .reply(200, []);

    await importCommand.action({ file: exportFile, organizationId, dryRun: true, json: true }, undefined);

    expect(scope.isDone()).toBe(true);
    const output = getJsonOutput();
    expect(output.dryRun).toBe(true);
    expect(output.apps[0].id).toBeNull();
    expect(output.apps[0].webUrl).toBeNull();
  });

  it('should only import the apps matching the include filters', async () => {
    await writeExportFile([
      {
        folder: 'App One-11111111',
        files: { 'app-detail.json': { id: '11111111', name: 'App One', appType: 'capacitor' } },
      },
      {
        folder: 'App Two-22222222',
        files: { 'app-detail.json': { id: '22222222', name: 'App Two', appType: 'capacitor' } },
      },
      {
        folder: 'App Three-33333333',
        files: { 'app-detail.json': { id: '33333333', name: 'App Three', appType: 'capacitor' } },
      },
    ]);

    const scope = nock(DEFAULT_API_BASE_URL)
      .get('/v1/apps')
      .query({ organizationId, limit: 50, offset: 0 })
      .reply(200, [])
      .post('/v1/apps', { name: 'App One', type: 'capacitor' })
      .query({ organizationId })
      .reply(201, { id: 'app-1', name: 'App One', type: 'capacitor' })
      .get('/v1/apps/app-1/channels')
      .reply(200, [])
      .post('/v1/apps', { name: 'App Three', type: 'capacitor' })
      .query({ organizationId })
      .reply(201, { id: 'app-3', name: 'App Three', type: 'capacitor' })
      .get('/v1/apps/app-3/channels')
      .reply(200, []);

    await importCommand.action(
      { file: exportFile, organizationId, include: ['App One,33333333'], json: true },
      undefined,
    );

    expect(scope.isDone()).toBe(true);
    const output = getJsonOutput();
    expect(output.apps).toHaveLength(2);
    expect(output.apps.map((app: any) => app.sourceName)).toEqual(['App One', 'App Three']);
  });

  it('should report skipped apps with an unsupported app type', async () => {
    await writeExportFile([
      {
        folder: 'RN App-22222222',
        files: { 'app-detail.json': { id: '22222222', name: 'RN App', appType: 'react_native' } },
      },
    ]);

    const scope = nock(DEFAULT_API_BASE_URL)
      .get('/v1/apps')
      .query({ organizationId, limit: 50, offset: 0 })
      .reply(200, []);

    await importCommand.action({ file: exportFile, organizationId, json: true }, undefined);

    expect(scope.isDone()).toBe(true);
    const output = getJsonOutput();
    expect(output.apps).toEqual([]);
    expect(output.skippedApps).toEqual([
      { sourceId: '22222222', sourceName: 'RN App', reason: expect.stringContaining('react_native') },
    ]);
  });

  it('should error in non-interactive environment if no file is provided', async () => {
    await expect(importCommand.action({ organizationId }, undefined)).rejects.toThrow('Process exited with code 1');
    expect(vi.mocked(consola).error).toHaveBeenCalledWith(
      'You must provide the export file path when running in non-interactive environment.',
    );
  });
});
