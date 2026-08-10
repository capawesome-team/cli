import { parseAppflowExport } from '@/utils/appflow-export.js';
import { UserError } from '@/utils/error.js';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

describe('appflow-export', () => {
  let exportDirectory: string;

  beforeEach(() => {
    exportDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'appflow-export-test-'));
  });

  afterEach(() => {
    fs.rmSync(exportDirectory, { recursive: true, force: true });
  });

  const writeAppFiles = (appFolder: string, files: Record<string, unknown>) => {
    for (const [fileName, content] of Object.entries(files)) {
      const filePath = path.join(exportDirectory, 'apps', appFolder, fileName);
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      if (typeof content === 'string' || Buffer.isBuffer(content)) {
        fs.writeFileSync(filePath, content);
      } else {
        fs.writeFileSync(filePath, JSON.stringify(content));
      }
    }
  };

  it('should throw a user error if the export does not contain an apps directory', async () => {
    await expect(parseAppflowExport(exportDirectory)).rejects.toThrow(UserError);
  });

  it('should parse a fully configured app', async () => {
    writeAppFiles('My App-6668c18c', {
      'app-detail.json': { id: '6668c18c', name: 'My App', appType: 'capacitor' },
      'repo-association.json': {
        gitProvider: 'github',
        gitUsername: 'robingenz',
        cloneUrl: 'https://github.com/robingenz/appflow-export-test.git',
      },
      'environments.json': [
        { id: 33513, name: 'Development', vars: { DEBUG: 'true' }, secrets: null },
        { id: 33515, name: 'Production', vars: {}, secrets: { API_KEY: 'secret' } },
      ],
      'live-update-channels.json': [
        { id: 'd33204c6', name: 'Production' },
        { id: '1e168146', name: 'Staging' },
      ],
      'native-configs.json': [
        {
          id: 41087,
          name: 'Development',
          configs: {
            base: { name: 'My App (Dev)', bundle_id: 'dev.robingenz.app.dev' },
            ionic: { channel_name: 'Development', update_method: 'background' },
          },
        },
        { id: 41089, name: 'Barebones', configs: { base: { bundle_id: 'dev.robingenz.app.bare' } } },
      ],
      'native-build-automations.json': [
        {
          name: 'Android Release',
          gitBranch: 'main',
          type: 'package',
          platform: 'android',
          buildType: 'release',
          environmentId: 33515,
          webhook: 'https://example.com/webhook',
          automationEnabled: true,
          nativeConfigId: 41087,
          signingCertificateId: 154267,
          destinationId: null,
        },
        {
          name: 'iOS Store',
          gitBranch: 'main',
          type: 'package',
          platform: 'ios',
          buildType: 'development',
          environmentId: 99999,
          webhook: null,
          automationEnabled: false,
          nativeConfigId: null,
          signingCertificateId: null,
          destinationId: null,
        },
      ],
      'web-build-automations.json': [
        {
          name: 'Web Prod',
          gitBranch: 'main',
          type: 'deploy',
          platform: 'web-deploy',
          environmentId: 33515,
          webhook: null,
          automationEnabled: true,
          channelIds: ['1e168146', 'd33204c6'],
          webPreviewEnabled: true,
        },
      ],
      'signing-certificates/android/Debug-154267/android-signing-certificate.json': {
        id: 154267,
        name: 'Debug',
        keystoreFile: 'keystore.jks',
        keystorePassword: 'test1234',
        keyAlias: 'key',
        keyPassword: 'test1234',
      },
      'signing-certificates/android/Debug-154267/keystore.jks': Buffer.from('keystore'),
      'signing-certificates/ios/Dev-154266/ios-signing-certificate.json': {
        id: 154266,
        name: 'Dev',
        p12File: 'ios-certificate.p12',
        p12Password: '123456',
        provisioningProfiles: ['Test.mobileprovision'],
      },
      'signing-certificates/ios/Dev-154266/ios-certificate.p12': Buffer.from('p12'),
      'signing-certificates/ios/Dev-154266/Test.mobileprovision': Buffer.from('profile'),
      'store-destinations/android/Prod-27890/play-store-destination.json': {
        id: 27890,
        name: 'Prod',
        artifactType: 'aab',
        packageName: 'dev.robingenz.app',
        track: 'internal',
      },
      'store-destinations/android/Prod-27890/json-key.json': { type: 'service_account' },
    });

    const { apps, skippedApps } = await parseAppflowExport(exportDirectory);

    expect(skippedApps).toEqual([]);
    expect(apps).toHaveLength(1);
    const app = apps[0]!;
    expect(app.sourceId).toBe('6668c18c');
    expect(app.sourceName).toBe('My App');
    expect(app.type).toBe('capacitor');
    expect(app.repository).toEqual({
      ownerSlug: 'robingenz',
      provider: 'github',
      repositorySlug: 'appflow-export-test',
      projectSlug: undefined,
    });
    expect(app.environments).toEqual([
      { name: 'Development', variables: [{ key: 'DEBUG', value: 'true' }], secrets: [] },
      { name: 'Production', variables: [], secrets: [{ key: 'API_KEY', value: 'secret' }] },
    ]);
    expect(app.channels).toEqual(['Production', 'Staging']);
    expect(app.configurations).toEqual([
      { name: 'Development', displayName: 'My App (Dev)', packageName: 'dev.robingenz.app.dev' },
      { name: 'Barebones', displayName: undefined, packageName: 'dev.robingenz.app.bare' },
    ]);
    expect(app.certificates).toHaveLength(2);
    expect(app.certificates[0]).toMatchObject({
      name: 'Debug',
      platform: 'android',
      password: 'test1234',
      keyAlias: 'key',
      keyPassword: 'test1234',
    });
    expect(app.certificates[1]).toMatchObject({ name: 'Dev', platform: 'ios', password: '123456' });
    expect(app.certificates[1]!.provisioningProfilePaths).toHaveLength(1);
    expect(app.destinations).toEqual([
      {
        name: 'Prod',
        platform: 'android',
        androidPackageName: 'dev.robingenz.app',
        androidBuildArtifactType: 'aab',
        googlePlayTrack: 'internal',
        googleServiceAccountKeyPath: expect.stringContaining('json-key.json'),
      },
    ]);
    expect(app.automations).toEqual([
      {
        name: 'Android Release',
        platform: 'android',
        triggerPattern: 'main',
        buildType: 'release',
        enabled: true,
        appCertificateName: 'Debug',
        appConfigurationName: 'Development',
        appDestinationName: undefined,
        appEnvironmentName: 'Production',
      },
      {
        name: 'iOS Store',
        platform: 'ios',
        triggerPattern: 'main',
        buildType: 'development',
        enabled: false,
        appCertificateName: undefined,
        appConfigurationName: undefined,
        appDestinationName: undefined,
        appEnvironmentName: undefined,
      },
      {
        name: 'Web Prod (Staging)',
        platform: 'web',
        triggerPattern: 'main',
        enabled: true,
        appChannelName: 'Staging',
        appEnvironmentName: 'Production',
      },
      {
        name: 'Web Prod (Production)',
        platform: 'web',
        triggerPattern: 'main',
        enabled: true,
        appChannelName: 'Production',
        appEnvironmentName: 'Production',
      },
    ]);
    expect(app.notes).toHaveLength(4);
    expect(app.notes).toContainEqual(expect.stringContaining('webhook'));
    expect(app.notes).toContainEqual(expect.stringContaining('unknown environment'));
    expect(app.notes).toContainEqual(expect.stringContaining('web previews'));
    expect(app.notes).toContainEqual(expect.stringContaining('Live Update plugin settings'));
  });

  it('should keep the ambiguous app type `ionic` as source app type', async () => {
    writeAppFiles('Legacy App-11111111', {
      'app-detail.json': { id: '11111111', name: 'Legacy App', appType: 'ionic' },
    });

    const { apps } = await parseAppflowExport(exportDirectory);

    expect(apps).toHaveLength(1);
    expect(apps[0]!.sourceAppType).toBe('ionic');
    expect(apps[0]!.notes).toEqual([]);
  });

  it('should skip apps with an unsupported app type', async () => {
    writeAppFiles('RN App-22222222', {
      'app-detail.json': { id: '22222222', name: 'RN App', appType: 'react_native' },
    });
    writeAppFiles('Other App-33333333', {
      'app-detail.json': { id: '33333333', name: 'Other App', appType: 'unknown' },
    });

    const { apps, skippedApps } = await parseAppflowExport(exportDirectory);

    expect(apps).toEqual([]);
    expect(skippedApps).toContainEqual({
      sourceId: '22222222',
      sourceName: 'RN App',
      reason: expect.stringContaining('react_native'),
      retryLater: true,
    });
    expect(skippedApps).toContainEqual({
      sourceId: '33333333',
      sourceName: 'Other App',
      reason: expect.stringContaining('unknown'),
      retryLater: false,
    });
  });

  it('should handle an empty repo association serialized as an array', async () => {
    writeAppFiles('No Repo-44444444', {
      'app-detail.json': { id: '44444444', name: 'No Repo', appType: 'capacitor' },
      'repo-association.json': [],
    });

    const { apps } = await parseAppflowExport(exportDirectory);

    expect(apps[0]!.repository).toBeNull();
  });

  it('should skip a signing certificate with a missing file', async () => {
    writeAppFiles('Broken Cert-55555555', {
      'app-detail.json': { id: '55555555', name: 'Broken Cert', appType: 'capacitor' },
      'signing-certificates/android/Debug-1/android-signing-certificate.json': {
        id: 1,
        name: 'Debug',
        keystoreFile: 'keystore.jks',
        keystorePassword: 'test',
        keyAlias: 'key',
        keyPassword: 'test',
      },
    });

    const { apps } = await parseAppflowExport(exportDirectory);

    expect(apps[0]!.certificates).toEqual([]);
    expect(apps[0]!.notes).toContainEqual(expect.stringContaining('keystore.jks'));
  });

  it('should skip an app with an invalid app detail file', async () => {
    writeAppFiles('Invalid-66666666', {
      'app-detail.json': 'not json',
    });

    const { apps, skippedApps } = await parseAppflowExport(exportDirectory);

    expect(apps).toEqual([]);
    expect(skippedApps).toHaveLength(1);
    expect(skippedApps[0]!.retryLater).toBe(false);
  });
});
