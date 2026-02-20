import { DEFAULT_API_BASE_URL } from '@/config/consts.js';
import authorizationService from '@/services/authorization-service.js';
import { fileExistsAtPath } from '@/utils/file.js';
import userConfig from '@/utils/user-config.js';
import consola from 'consola';
import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import registerCommand from './register.js';

// Mock dependencies
vi.mock('@/utils/user-config.js');
vi.mock('@/utils/prompt.js');
vi.mock('@/services/authorization-service.js');
vi.mock('@/utils/file.js');
vi.mock('@/utils/zip.js');
vi.mock('@/utils/buffer.js');
vi.mock('@/utils/private-key.js');
vi.mock('@/utils/hash.js');
vi.mock('@/utils/signature.js');
vi.mock('consola');

describe('apps-liveupdates-register', () => {
  const mockUserConfig = vi.mocked(userConfig);
  const mockAuthorizationService = vi.mocked(authorizationService);
  const mockFileExistsAtPath = vi.mocked(fileExistsAtPath);
  const mockConsola = vi.mocked(consola);

  beforeEach(() => {
    vi.clearAllMocks();

    mockUserConfig.read.mockReturnValue({ token: 'test-token' });
    mockAuthorizationService.hasAuthorizationToken.mockReturnValue(true);
    mockAuthorizationService.getCurrentAuthorizationToken.mockReturnValue('test-token');

    vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
      throw new Error(`Process exited with code ${code}`);
    });
  });

  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
  });

  it('should require authentication', async () => {
    const appId = 'app-123';
    const bundleUrl = 'https://example.com/bundle.zip';
    const options = { appId, url: bundleUrl, rolloutPercentage: 1 };

    mockAuthorizationService.hasAuthorizationToken.mockReturnValue(false);
    vi.mocked((await import('@/utils/prompt.js')).prompt).mockResolvedValueOnce(false);

    await expect(registerCommand.action(options, undefined)).rejects.toThrow('Process exited with code 1');

    expect(mockConsola.error).toHaveBeenCalledWith('You must be logged in to run this command.');
    expect(mockConsola.error).toHaveBeenCalledWith('Please run the `login` command first.');
  });

  it('should register bundle with self-hosted URL', async () => {
    const appId = 'app-123';
    const bundleUrl = 'https://example.com/bundle.zip';
    const bundleId = 'bundle-456';
    const testToken = 'test-token';

    const options = {
      appId,
      url: bundleUrl,
      rolloutPercentage: 1,
      yes: true,
    };

    const appScope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, { id: appId, name: 'Test App' });

    const bundleScope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/bundles`, {
        appId,
        url: bundleUrl,
        artifactType: 'zip',
        rolloutPercentage: 0.01,
      })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: bundleId, appBuildId: 'build-789' });

    await registerCommand.action(options, undefined);

    expect(appScope.isDone()).toBe(true);
    expect(bundleScope.isDone()).toBe(true);
    expect(mockConsola.info).toHaveBeenCalledWith(`Bundle Artifact ID: ${bundleId}`);
    expect(mockConsola.success).toHaveBeenCalledWith('Live Update successfully registered.');
  });

  it('should pass gitRef to API when provided', async () => {
    const appId = 'app-123';
    const bundleUrl = 'https://example.com/bundle.zip';
    const bundleId = 'bundle-456';
    const testToken = 'test-token';
    const gitRef = 'v1.0.0';

    const options = {
      appId,
      url: bundleUrl,
      rolloutPercentage: 1,
      gitRef,
      yes: true,
    };

    const appScope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, { id: appId, name: 'Test App' });

    const bundleScope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/bundles`, {
        appId,
        url: bundleUrl,
        artifactType: 'zip',
        gitRef,
        rolloutPercentage: 0.01,
      })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: bundleId, appBuildId: 'build-789' });

    await registerCommand.action(options, undefined);

    expect(appScope.isDone()).toBe(true);
    expect(bundleScope.isDone()).toBe(true);
    expect(mockConsola.info).toHaveBeenCalledWith(`Bundle Artifact ID: ${bundleId}`);
    expect(mockConsola.success).toHaveBeenCalledWith('Live Update successfully registered.');
  });

  it('should register bundle with checksum when path is provided', async () => {
    const appId = 'app-123';
    const bundleUrl = 'https://example.com/bundle.zip';
    const bundlePath = './bundle.zip';
    const testHash = 'test-hash';
    const bundleId = 'bundle-456';
    const testToken = 'test-token';
    const testBuffer = Buffer.from('test');

    const options = {
      appId,
      url: bundleUrl,
      path: bundlePath,
      rolloutPercentage: 1,
      yes: true,
    };

    mockFileExistsAtPath.mockResolvedValue(true);

    // Mock utility functions
    const mockZip = await import('@/utils/zip.js');
    const mockBuffer = await import('@/utils/buffer.js');
    const mockHash = await import('@/utils/hash.js');

    vi.mocked(mockZip.default.isZipped).mockReturnValue(true);
    vi.mocked(mockBuffer.createBufferFromPath).mockResolvedValue(testBuffer);
    vi.mocked(mockHash.createHash).mockResolvedValue(testHash);

    const appScope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, { id: appId, name: 'Test App' });

    const bundleScope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/bundles`, {
        appId,
        url: bundleUrl,
        checksum: testHash,
        artifactType: 'zip',
        rolloutPercentage: 0.01,
      })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: bundleId, appBuildId: 'build-789' });

    await registerCommand.action(options, undefined);

    expect(appScope.isDone()).toBe(true);
    expect(bundleScope.isDone()).toBe(true);
    expect(mockConsola.info).toHaveBeenCalledWith(`Bundle Artifact ID: ${bundleId}`);
    expect(mockConsola.success).toHaveBeenCalledWith('Live Update successfully registered.');
  });

  it('should register bundle with signature when private key is provided', async () => {
    const appId = 'app-123';
    const bundleUrl = 'https://example.com/bundle.zip';
    const bundlePath = './bundle.zip';
    const privateKeyPath = 'private-key.pem';
    const testHash = 'test-hash';
    const testSignature = 'test-signature';
    const bundleId = 'bundle-456';
    const testToken = 'test-token';
    const testBuffer = Buffer.from('test');

    const options = {
      appId,
      url: bundleUrl,
      path: bundlePath,
      privateKey: privateKeyPath,
      rolloutPercentage: 1,
      yes: true,
    };

    mockFileExistsAtPath.mockImplementation((path: string) => {
      if (path === privateKeyPath) return Promise.resolve(true);
      if (path === bundlePath) return Promise.resolve(true);
      return Promise.resolve(false);
    });

    // Mock utility functions
    const mockZip = await import('@/utils/zip.js');
    const mockBuffer = await import('@/utils/buffer.js');
    const mockPrivateKey = await import('@/utils/private-key.js');
    const mockHash = await import('@/utils/hash.js');
    const mockSignature = await import('@/utils/signature.js');

    vi.mocked(mockZip.default.isZipped).mockReturnValue(true);
    vi.mocked(mockBuffer.createBufferFromPath).mockResolvedValue(testBuffer);
    vi.mocked(mockBuffer.isPrivateKeyContent).mockReturnValue(false);
    vi.mocked(mockPrivateKey.formatPrivateKey).mockReturnValue('formatted-private-key');
    vi.mocked(mockBuffer.createBufferFromString).mockReturnValue(testBuffer);
    vi.mocked(mockHash.createHash).mockResolvedValue(testHash);
    vi.mocked(mockSignature.createSignature).mockResolvedValue(testSignature);

    const appScope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, { id: appId, name: 'Test App' });

    const bundleScope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/bundles`, {
        appId,
        url: bundleUrl,
        checksum: testHash,
        signature: testSignature,
        artifactType: 'zip',
        rolloutPercentage: 0.01,
      })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: bundleId, appBuildId: 'build-789' });

    await registerCommand.action(options, undefined);

    expect(appScope.isDone()).toBe(true);
    expect(bundleScope.isDone()).toBe(true);
    expect(mockConsola.info).toHaveBeenCalledWith(`Bundle Artifact ID: ${bundleId}`);
    expect(mockConsola.success).toHaveBeenCalledWith('Live Update successfully registered.');
  });

  it('should handle private key with plain text content', async () => {
    const appId = 'app-123';
    const bundleUrl = 'https://example.com/bundle.zip';
    const bundlePath = './bundle.zip';
    const privateKeyContent =
      '-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQCgxvzJrMCbmtjb\n-----END PRIVATE KEY-----';
    const testHash = 'test-hash';
    const testSignature = 'test-signature';
    const bundleId = 'bundle-456';
    const testToken = 'test-token';
    const testBuffer = Buffer.from('test');

    const options = {
      appId,
      url: bundleUrl,
      path: bundlePath,
      privateKey: privateKeyContent,
      rolloutPercentage: 1,
      yes: true,
    };

    mockFileExistsAtPath.mockResolvedValue(true);

    // Mock utility functions
    const mockZip = await import('@/utils/zip.js');
    const mockBuffer = await import('@/utils/buffer.js');
    const mockPrivateKey = await import('@/utils/private-key.js');
    const mockHash = await import('@/utils/hash.js');
    const mockSignature = await import('@/utils/signature.js');

    vi.mocked(mockZip.default.isZipped).mockReturnValue(true);
    vi.mocked(mockBuffer.createBufferFromPath).mockResolvedValue(testBuffer);
    vi.mocked(mockBuffer.createBufferFromString).mockReturnValue(testBuffer);
    vi.mocked(mockBuffer.isPrivateKeyContent).mockReturnValue(true);
    vi.mocked(mockPrivateKey.formatPrivateKey).mockReturnValue('formatted-private-key');
    vi.mocked(mockHash.createHash).mockResolvedValue(testHash);
    vi.mocked(mockSignature.createSignature).mockResolvedValue(testSignature);

    const appScope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, { id: appId, name: 'Test App' });

    const bundleScope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/bundles`, {
        appId,
        url: bundleUrl,
        checksum: testHash,
        signature: testSignature,
        artifactType: 'zip',
        rolloutPercentage: 0.01,
      })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: bundleId, appBuildId: 'build-789' });

    await registerCommand.action(options, undefined);

    expect(appScope.isDone()).toBe(true);
    expect(bundleScope.isDone()).toBe(true);
    expect(mockConsola.info).toHaveBeenCalledWith(`Bundle Artifact ID: ${bundleId}`);
    expect(mockConsola.success).toHaveBeenCalledWith('Live Update successfully registered.');
  });

  it('should handle private key file not found', async () => {
    const appId = 'app-123';
    const bundleUrl = 'https://example.com/bundle.zip';
    const bundlePath = './bundle.zip';
    const privateKeyPath = 'nonexistent-key.pem';

    const options = {
      appId,
      url: bundleUrl,
      path: bundlePath,
      privateKey: privateKeyPath,
      rolloutPercentage: 1,
    };

    mockFileExistsAtPath.mockImplementation((path: string) => {
      if (path === privateKeyPath) return Promise.resolve(false);
      return Promise.resolve(true);
    });

    // Mock utility functions
    const mockZip = await import('@/utils/zip.js');
    const mockBuffer = await import('@/utils/buffer.js');
    vi.mocked(mockZip.default.isZipped).mockReturnValue(true);
    vi.mocked(mockBuffer.isPrivateKeyContent).mockReturnValue(false);

    await expect(registerCommand.action(options, undefined)).rejects.toThrow('Process exited with code 1');

    expect(mockConsola.error).toHaveBeenCalledWith('Private key file not found.');
  });

  it('should validate path must be a zip file', async () => {
    const appId = 'app-123';
    const bundleUrl = 'https://example.com/bundle.zip';
    const bundlePath = './dist';

    const options = {
      appId,
      url: bundleUrl,
      path: bundlePath,
      rolloutPercentage: 1,
    };

    mockFileExistsAtPath.mockResolvedValue(true);

    // Mock zip utility to return false
    const mockZip = await import('@/utils/zip.js');
    vi.mocked(mockZip.default.isZipped).mockReturnValue(false);

    await expect(registerCommand.action(options, undefined)).rejects.toThrow('Process exited with code 1');

    expect(mockConsola.error).toHaveBeenCalledWith('The path must be a zip file when providing a URL.');
  });

  it('should handle API error during registration', async () => {
    const appId = 'app-123';
    const bundleUrl = 'https://example.com/bundle.zip';
    const testToken = 'test-token';

    const options = {
      appId,
      url: bundleUrl,
      rolloutPercentage: 1,
      yes: true,
    };

    const appScope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, { id: appId, name: 'Test App' });

    const bundleScope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/bundles`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(400, { message: 'Invalid bundle data' });

    await expect(registerCommand.action(options, undefined)).rejects.toThrow();

    expect(appScope.isDone()).toBe(true);
    expect(bundleScope.isDone()).toBe(true);
  });
});
