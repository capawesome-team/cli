import { DEFAULT_API_BASE_URL } from '@/config/consts.js';
import authorizationService from '@/services/authorization-service.js';
import { isInteractive } from '@/utils/environment.js';
import { prompt } from '@/utils/prompt.js';
import userConfig from '@/utils/user-config.js';
import consola from 'consola';
import fs from 'fs/promises';
import nock from 'nock';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import createDestinationCommand from './create.js';

// Mock dependencies
vi.mock('@/utils/user-config.js');
vi.mock('@/utils/prompt.js');
vi.mock('@/services/authorization-service.js');
vi.mock('@/utils/environment.js');
vi.mock('consola');

describe('apps-destinations-create', () => {
  const mockUserConfig = vi.mocked(userConfig);
  const mockPrompt = vi.mocked(prompt);
  const mockIsInteractive = vi.mocked(isInteractive);
  const mockConsola = vi.mocked(consola);
  const mockAuthorizationService = vi.mocked(authorizationService);

  const appId = 'app-123';
  const destinationId = 'destination-456';
  const googleServiceAccountKeyId = 'key-789';
  const testToken = 'test-token';
  let tempDirectory: string;
  let googleServiceAccountKeyFile: string;

  beforeEach(async () => {
    vi.clearAllMocks();

    mockUserConfig.read.mockReturnValue({ token: testToken });
    mockAuthorizationService.getCurrentAuthorizationToken.mockReturnValue(testToken);
    mockAuthorizationService.hasAuthorizationToken.mockReturnValue(true);
    mockIsInteractive.mockReturnValue(false);

    vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
      throw new Error(`Process exited with code ${code}`);
    });

    tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'capawesome-cli-destinations-create-'));
    googleServiceAccountKeyFile = path.join(tempDirectory, 'service-account.json');
    await fs.writeFile(googleServiceAccountKeyFile, '{}');
  });

  afterEach(async () => {
    nock.cleanAll();
    vi.restoreAllMocks();
    await fs.rm(tempDirectory, { force: true, recursive: true });
  });

  it('should create a Huawei AppGallery destination', async () => {
    const options = {
      appId,
      name: 'Huawei',
      platform: 'android' as const,
      type: 'huawei-appgallery' as const,
      huaweiAppId: '112233445',
      huaweiClientId: 'client-id',
      huaweiClientSecret: 'client-secret',
      androidBuildArtifactType: 'aab' as const,
      androidReleaseStatus: 'draft' as const,
    };

    const scope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/destinations`, {
        appId,
        name: 'Huawei',
        platform: 'android',
        type: 'huawei-appgallery',
        androidBuildArtifactType: 'aab',
        androidReleaseStatus: 'draft',
        huaweiAppId: '112233445',
        huaweiClientId: 'client-id',
        huaweiClientSecret: 'client-secret',
      })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: destinationId });

    await createDestinationCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockConsola.success).toHaveBeenCalledWith('Destination created successfully.');
  });

  it('should create a Firebase App Distribution destination for iOS', async () => {
    const options = {
      appId,
      name: 'Firebase',
      platform: 'ios' as const,
      type: 'firebase-app-distribution' as const,
      firebaseAppId: '1:123456789012:ios:0a1b2c3d4e5f67890',
      firebaseTesterGroup: ['qa-team, beta-testers', 'internal'],
      googleServiceAccountKeyFile,
    };

    const keyScope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/google-service-account-keys`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: googleServiceAccountKeyId });
    const destinationScope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/destinations`, {
        appId,
        name: 'Firebase',
        platform: 'ios',
        type: 'firebase-app-distribution',
        appGoogleServiceAccountKeyId: googleServiceAccountKeyId,
        firebaseAppId: '1:123456789012:ios:0a1b2c3d4e5f67890',
        firebaseTesterGroups: ['qa-team', 'beta-testers', 'internal'],
      })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: destinationId });

    await createDestinationCommand.action(options, undefined);

    expect(keyScope.isDone()).toBe(true);
    expect(destinationScope.isDone()).toBe(true);
    expect(mockConsola.success).toHaveBeenCalledWith('Destination created successfully.');
  });

  it('should require the publishing format for a Firebase App Distribution destination for Android', async () => {
    const options = {
      appId,
      name: 'Firebase',
      platform: 'android' as const,
      type: 'firebase-app-distribution' as const,
      firebaseAppId: '1:123456789012:android:0a1b2c3d4e5f67890',
      googleServiceAccountKeyFile,
    };

    await expect(createDestinationCommand.action(options, undefined)).rejects.toThrow('Process exited with code 1');

    expect(mockConsola.error).toHaveBeenCalledWith(
      'You must provide the Android build artifact type when running in non-interactive environment.',
    );
  });

  it('should reject a type that is not supported for the platform', async () => {
    const options = {
      appId,
      name: 'Huawei',
      platform: 'ios' as const,
      type: 'huawei-appgallery' as const,
    };

    await expect(createDestinationCommand.action(options, undefined)).rejects.toThrow('Process exited with code 1');

    expect(mockConsola.error).toHaveBeenCalledWith(
      'The destination type `huawei-appgallery` is not supported for the ios platform. Supported types: app-store-connect, firebase-app-distribution.',
    );
  });

  it('should default to the Google Play type for Android when running non-interactively', async () => {
    const options = {
      appId,
      name: 'Google Play',
      platform: 'android' as const,
      androidPackageName: 'com.example.app',
      androidBuildArtifactType: 'aab' as const,
      androidReleaseStatus: 'completed' as const,
      googlePlayTrack: 'internal',
      googleServiceAccountKeyFile,
    };

    const keyScope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/google-service-account-keys`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: googleServiceAccountKeyId });
    const destinationScope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/destinations`, {
        appId,
        name: 'Google Play',
        platform: 'android',
        type: 'google-play',
        androidPackageName: 'com.example.app',
        androidBuildArtifactType: 'aab',
        androidReleaseStatus: 'completed',
        appGoogleServiceAccountKeyId: googleServiceAccountKeyId,
        googlePlayTrack: 'internal',
      })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: destinationId });

    await createDestinationCommand.action(options, undefined);

    expect(keyScope.isDone()).toBe(true);
    expect(destinationScope.isDone()).toBe(true);
    expect(mockPrompt).not.toHaveBeenCalled();
  });

  it('should prompt for the type with the options of the platform when running interactively', async () => {
    mockIsInteractive.mockReturnValue(true);
    mockPrompt.mockResolvedValueOnce('firebase-app-distribution').mockResolvedValueOnce('');
    const options = {
      appId,
      name: 'Firebase',
      platform: 'ios' as const,
      firebaseAppId: '1:123456789012:ios:0a1b2c3d4e5f67890',
      googleServiceAccountKeyFile,
    };

    nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/google-service-account-keys`)
      .reply(201, { id: googleServiceAccountKeyId });
    const destinationScope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/destinations`, {
        appId,
        name: 'Firebase',
        platform: 'ios',
        type: 'firebase-app-distribution',
        appGoogleServiceAccountKeyId: googleServiceAccountKeyId,
        firebaseAppId: '1:123456789012:ios:0a1b2c3d4e5f67890',
      })
      .reply(201, { id: destinationId });

    await createDestinationCommand.action(options, undefined);

    expect(destinationScope.isDone()).toBe(true);
    expect(mockPrompt).toHaveBeenCalledWith('Select the destination type:', {
      type: 'select',
      options: [
        { label: 'App Store Connect', value: 'app-store-connect' },
        { label: 'Firebase App Distribution', value: 'firebase-app-distribution' },
      ],
    });
  });
});
