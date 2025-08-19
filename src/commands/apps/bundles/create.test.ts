import { DEFAULT_API_BASE_URL } from '@/config/consts.js';
import authorizationService from '@/services/authorization-service.js';
import { fileExistsAtPath, isDirectory } from '@/utils/file.js';
import userConfig from '@/utils/userConfig.js';
import consola from 'consola';
import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import createBundleCommand from './create.js';

// Mock dependencies
vi.mock('@/utils/userConfig.js');
vi.mock('@/services/authorization-service.js');
vi.mock('@/utils/file.js');
vi.mock('@/utils/zip.js');
vi.mock('@/utils/buffer.js');
vi.mock('@/utils/hash.js');
vi.mock('@/utils/signature.js');
vi.mock('consola');

describe('apps-bundles-create', () => {
  const mockUserConfig = vi.mocked(userConfig);
  const mockAuthorizationService = vi.mocked(authorizationService);
  const mockFileExistsAtPath = vi.mocked(fileExistsAtPath);
  const mockIsDirectory = vi.mocked(isDirectory);
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
    const options = { appId, path: './dist', artifactType: 'zip' as const, rollout: 1 };

    mockAuthorizationService.hasAuthorizationToken.mockReturnValue(false);

    await expect(createBundleCommand.action(options, undefined)).rejects.toThrow('Process exited with code 1');

    expect(mockConsola.error).toHaveBeenCalledWith('You must be logged in to run this command.');
  });

  it('should create bundle with self-hosted URL', async () => {
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
      artifactType: 'zip' as const,
      rollout: 1,
    };

    mockFileExistsAtPath.mockResolvedValue(true);
    mockIsDirectory.mockResolvedValue(false);

    // Mock utility functions
    const mockZip = await import('@/utils/zip.js');
    const mockBuffer = await import('@/utils/buffer.js');
    const mockHash = await import('@/utils/hash.js');

    vi.mocked(mockZip.default.isZipped).mockReturnValue(true);
    vi.mocked(mockBuffer.createBufferFromPath).mockResolvedValue(testBuffer);
    vi.mocked(mockHash.createHash).mockResolvedValue(testHash);

    const scope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/bundles`, {
        appId,
        url: bundleUrl,
        checksum: testHash,
        artifactType: 'zip',
        rolloutPercentage: 1,
      })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: bundleId });

    await createBundleCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockConsola.success).toHaveBeenCalledWith('Bundle successfully created.');
    expect(mockConsola.info).toHaveBeenCalledWith(`Bundle ID: ${bundleId}`);
  });

  it('should handle path validation errors', async () => {
    const appId = 'app-123';
    const nonexistentPath = './nonexistent';

    const options = { appId, path: nonexistentPath, artifactType: 'zip' as const, rollout: 1 };

    mockFileExistsAtPath.mockResolvedValue(false);

    await expect(createBundleCommand.action(options, undefined)).rejects.toThrow('Process exited with code 1');

    expect(mockConsola.error).toHaveBeenCalledWith('The path does not exist.');
  });

  it('should validate manifest artifact type requires directory', async () => {
    const appId = 'app-123';
    const bundlePath = './bundle.zip';

    const options = {
      appId,
      path: bundlePath,
      artifactType: 'manifest' as const,
      rollout: 1,
    };

    mockFileExistsAtPath.mockResolvedValue(true);
    mockIsDirectory.mockResolvedValue(false);

    await expect(createBundleCommand.action(options, undefined)).rejects.toThrow('Process exited with code 1');

    expect(mockConsola.error).toHaveBeenCalledWith(
      'The path must be a folder when creating a bundle with an artifact type of `manifest`.',
    );
  });

  it('should validate manifest artifact type cannot use URL', async () => {
    const appId = 'app-123';
    const bundleUrl = 'https://example.com/bundle.zip';

    const options = {
      appId,
      url: bundleUrl,
      artifactType: 'manifest' as const,
      rollout: 1,
    };

    await expect(createBundleCommand.action(options, undefined)).rejects.toThrow('Process exited with code 1');

    expect(mockConsola.error).toHaveBeenCalledWith(
      'It is not yet possible to provide a URL when creating a bundle with an artifact type of `manifest`.',
    );
  });

  it('should handle API error during creation', async () => {
    const appId = 'app-123';
    const bundleUrl = 'https://example.com/bundle.zip';
    const testToken = 'test-token';

    const options = {
      appId,
      url: bundleUrl,
      artifactType: 'zip' as const,
      rollout: 1,
    };

    const scope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/bundles`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(400, { message: 'Invalid bundle data' });

    await expect(createBundleCommand.action(options, undefined)).rejects.toThrow();

    expect(scope.isDone()).toBe(true);
  });

  it('should handle private key file path', async () => {
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
      artifactType: 'zip' as const,
      rollout: 1,
    };

    mockFileExistsAtPath.mockImplementation((path: string) => {
      if (path === privateKeyPath) return Promise.resolve(true);
      if (path === bundlePath) return Promise.resolve(true);
      return Promise.resolve(false);
    });
    mockIsDirectory.mockResolvedValue(false);

    // Mock utility functions
    const mockZip = await import('@/utils/zip.js');
    const mockBuffer = await import('@/utils/buffer.js');
    const mockHash = await import('@/utils/hash.js');
    const mockSignature = await import('@/utils/signature.js');

    vi.mocked(mockZip.default.isZipped).mockReturnValue(true);
    vi.mocked(mockBuffer.createBufferFromPath).mockResolvedValue(testBuffer);
    vi.mocked(mockBuffer.isPrivateKeyContent).mockReturnValue(false);
    vi.mocked(mockHash.createHash).mockResolvedValue(testHash);
    vi.mocked(mockSignature.createSignature).mockResolvedValue(testSignature);

    const scope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/bundles`, {
        appId,
        url: bundleUrl,
        checksum: testHash,
        signature: testSignature,
        artifactType: 'zip',
        rolloutPercentage: 1,
      })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: bundleId });

    await createBundleCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockConsola.success).toHaveBeenCalledWith('Bundle successfully created.');
  });

  it('should handle private key plain text content', async () => {
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
      artifactType: 'zip' as const,
      rollout: 1,
    };

    mockFileExistsAtPath.mockResolvedValue(true);
    mockIsDirectory.mockResolvedValue(false);

    // Mock utility functions
    const mockZip = await import('@/utils/zip.js');
    const mockBuffer = await import('@/utils/buffer.js');
    const mockHash = await import('@/utils/hash.js');
    const mockSignature = await import('@/utils/signature.js');

    vi.mocked(mockZip.default.isZipped).mockReturnValue(true);
    vi.mocked(mockBuffer.createBufferFromPath).mockResolvedValue(testBuffer);
    vi.mocked(mockBuffer.createBufferFromString).mockReturnValue(testBuffer);
    vi.mocked(mockBuffer.isPrivateKeyContent).mockReturnValue(true);
    vi.mocked(mockHash.createHash).mockResolvedValue(testHash);
    vi.mocked(mockSignature.createSignature).mockResolvedValue(testSignature);

    const scope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/bundles`, {
        appId,
        url: bundleUrl,
        checksum: testHash,
        signature: testSignature,
        artifactType: 'zip',
        rolloutPercentage: 1,
      })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: bundleId });

    await createBundleCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockConsola.success).toHaveBeenCalledWith('Bundle successfully created.');
  });

  it('should handle private key file not found', async () => {
    const appId = 'app-123';
    const privateKeyPath = 'nonexistent-key.pem';

    const options = {
      appId,
      path: './dist',
      privateKey: privateKeyPath,
      artifactType: 'zip' as const,
      rollout: 1,
    };

    mockFileExistsAtPath.mockImplementation((path: string) => {
      if (path === privateKeyPath) return Promise.resolve(false);
      return Promise.resolve(true);
    });

    // Mock utility functions
    const mockBuffer = await import('@/utils/buffer.js');
    vi.mocked(mockBuffer.isPrivateKeyContent).mockReturnValue(false);

    await expect(createBundleCommand.action(options, undefined)).rejects.toThrow('Process exited with code 1');

    expect(mockConsola.error).toHaveBeenCalledWith('Private key file not found.');
  });

  it('should handle invalid private key format', async () => {
    const appId = 'app-123';
    const invalidPrivateKey = 'not-a-valid-key';

    const options = {
      appId,
      path: './dist',
      privateKey: invalidPrivateKey,
      artifactType: 'zip' as const,
      rollout: 1,
    };

    mockFileExistsAtPath.mockResolvedValue(true);
    mockIsDirectory.mockResolvedValue(false);

    // Mock utility functions
    const mockBuffer = await import('@/utils/buffer.js');
    vi.mocked(mockBuffer.isPrivateKeyContent).mockReturnValue(false);

    await expect(createBundleCommand.action(options, undefined)).rejects.toThrow('Process exited with code 1');

    expect(mockConsola.error).toHaveBeenCalledWith(
      'Private key must be either a path to a .pem file or the private key content as plain text.',
    );
  });
});
