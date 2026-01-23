import { DEFAULT_API_BASE_URL } from '@/config/consts.js';
import authorizationService from '@/services/authorization-service.js';
import { isInteractive } from '@/utils/environment.js';
import { fileExistsAtPath, getFilesInDirectoryAndSubdirectories, isDirectory } from '@/utils/file.js';
import userConfig from '@/utils/user-config.js';
import consola from 'consola';
import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import uploadCommand from './upload.js';

// Mock dependencies
vi.mock('@/utils/user-config.js');
vi.mock('@/services/authorization-service.js');
vi.mock('@/utils/file.js');
vi.mock('@/utils/zip.js');
vi.mock('@/utils/buffer.js');
vi.mock('@/utils/private-key.js');
vi.mock('@/utils/hash.js');
vi.mock('@/utils/signature.js');
vi.mock('@/utils/manifest.js');
vi.mock('@/utils/environment.js');
vi.mock('consola');

describe('apps-liveupdates-upload', () => {
  const mockUserConfig = vi.mocked(userConfig);
  const mockAuthorizationService = vi.mocked(authorizationService);
  const mockFileExistsAtPath = vi.mocked(fileExistsAtPath);
  const mockGetFilesInDirectoryAndSubdirectories = vi.mocked(getFilesInDirectoryAndSubdirectories);
  const mockIsDirectory = vi.mocked(isDirectory);
  const mockIsInteractive = vi.mocked(isInteractive);
  const mockConsola = vi.mocked(consola);

  beforeEach(() => {
    vi.clearAllMocks();

    mockUserConfig.read.mockReturnValue({ token: 'test-token' });
    mockAuthorizationService.hasAuthorizationToken.mockReturnValue(true);
    mockAuthorizationService.getCurrentAuthorizationToken.mockReturnValue('test-token');
    mockIsInteractive.mockReturnValue(false);

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

    await expect(uploadCommand.action(options, undefined)).rejects.toThrow('Process exited with code 1');

    expect(mockConsola.error).toHaveBeenCalledWith(
      'You must be logged in to run this command. Please run the `login` command first.',
    );
  });

  it('should handle path validation errors', async () => {
    const appId = 'app-123';
    const nonexistentPath = './nonexistent';

    const options = { appId, path: nonexistentPath, artifactType: 'zip' as const, rollout: 1 };

    mockFileExistsAtPath.mockResolvedValue(false);

    await expect(uploadCommand.action(options, undefined)).rejects.toThrow('Process exited with code 1');

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

    // Mock zip utility to return true so path validation passes
    const mockZip = await import('@/utils/zip.js');
    vi.mocked(mockZip.default.isZipped).mockReturnValue(true);

    await expect(uploadCommand.action(options, undefined)).rejects.toThrow('Process exited with code 1');

    expect(mockConsola.error).toHaveBeenCalledWith(
      'The path must be a folder when creating a bundle with an artifact type of `manifest`.',
    );
  });

  it('should upload bundle successfully', async () => {
    const appId = 'app-123';
    const bundlePath = './dist';
    const bundleId = 'bundle-456';
    const testToken = 'test-token';
    const testBuffer = Buffer.from('test');

    const options = {
      appId,
      path: bundlePath,
      artifactType: 'zip' as const,
      rollout: 1,
    };

    mockFileExistsAtPath.mockResolvedValue(true);
    mockIsDirectory.mockResolvedValue(true);
    mockGetFilesInDirectoryAndSubdirectories.mockResolvedValue([
      { href: 'index.html', mimeType: 'text/html', name: 'index.html', path: 'index.html' },
    ]);

    // Mock utility functions
    const mockZip = await import('@/utils/zip.js');
    const mockBuffer = await import('@/utils/buffer.js');
    const mockHash = await import('@/utils/hash.js');

    vi.mocked(mockZip.default.isZipped).mockReturnValue(false);
    vi.mocked(mockZip.default.zipFolder).mockResolvedValue(testBuffer);
    vi.mocked(mockHash.createHash).mockResolvedValue('test-hash');

    const appScope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, { id: appId, name: 'Test App' });

    const bundleScope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/bundles`, {
        appId,
        artifactType: 'zip',
        rolloutPercentage: 1,
      })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: bundleId, appBuildId: 'build-789' });

    const uploadScope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/bundles/${bundleId}/files`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: 'file-123' });

    const updateScope = nock(DEFAULT_API_BASE_URL)
      .patch(`/v1/apps/${appId}/bundles/${bundleId}`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, { id: bundleId });

    await uploadCommand.action(options, undefined);

    expect(appScope.isDone()).toBe(true);
    expect(bundleScope.isDone()).toBe(true);
    expect(uploadScope.isDone()).toBe(true);
    expect(updateScope.isDone()).toBe(true);
    expect(mockConsola.info).toHaveBeenCalledWith(`Build Artifact ID: ${bundleId}`);
    expect(mockConsola.success).toHaveBeenCalledWith('Live Update successfully uploaded.');
  });

  it('should pass gitRef to API when provided', async () => {
    const appId = 'app-123';
    const bundlePath = './dist';
    const bundleId = 'bundle-456';
    const testToken = 'test-token';
    const testBuffer = Buffer.from('test');
    const gitRef = 'main';

    const options = {
      appId,
      path: bundlePath,
      artifactType: 'zip' as const,
      rollout: 1,
      gitRef,
    };

    mockFileExistsAtPath.mockResolvedValue(true);
    mockIsDirectory.mockResolvedValue(true);
    mockGetFilesInDirectoryAndSubdirectories.mockResolvedValue([
      { href: 'index.html', mimeType: 'text/html', name: 'index.html', path: 'index.html' },
    ]);

    // Mock utility functions
    const mockZip = await import('@/utils/zip.js');
    const mockHash = await import('@/utils/hash.js');

    vi.mocked(mockZip.default.isZipped).mockReturnValue(false);
    vi.mocked(mockZip.default.zipFolder).mockResolvedValue(testBuffer);
    vi.mocked(mockHash.createHash).mockResolvedValue('test-hash');

    const appScope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, { id: appId, name: 'Test App' });

    const bundleScope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/bundles`, {
        appId,
        artifactType: 'zip',
        gitRef,
        rolloutPercentage: 1,
      })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: bundleId, appBuildId: 'build-789' });

    const uploadScope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/bundles/${bundleId}/files`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: 'file-123' });

    const updateScope = nock(DEFAULT_API_BASE_URL)
      .patch(`/v1/apps/${appId}/bundles/${bundleId}`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, { id: bundleId });

    await uploadCommand.action(options, undefined);

    expect(appScope.isDone()).toBe(true);
    expect(bundleScope.isDone()).toBe(true);
    expect(uploadScope.isDone()).toBe(true);
    expect(updateScope.isDone()).toBe(true);
    expect(mockConsola.info).toHaveBeenCalledWith(`Build Artifact ID: ${bundleId}`);
    expect(mockConsola.success).toHaveBeenCalledWith('Live Update successfully uploaded.');
  });

  it('should handle private key file path', async () => {
    const appId = 'app-123';
    const bundlePath = './dist';
    const privateKeyPath = 'private-key.pem';
    const testHash = 'test-hash';
    const testSignature = 'test-signature';
    const bundleId = 'bundle-456';
    const testToken = 'test-token';
    const testBuffer = Buffer.from('test');

    const options = {
      appId,
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
    mockIsDirectory.mockResolvedValue(true);
    mockGetFilesInDirectoryAndSubdirectories.mockResolvedValue([
      { href: 'index.html', mimeType: 'text/html', name: 'index.html', path: 'index.html' },
    ]);

    // Mock utility functions
    const mockZip = await import('@/utils/zip.js');
    const mockBuffer = await import('@/utils/buffer.js');
    const mockPrivateKey = await import('@/utils/private-key.js');
    const mockHash = await import('@/utils/hash.js');
    const mockSignature = await import('@/utils/signature.js');

    vi.mocked(mockZip.default.isZipped).mockReturnValue(false);
    vi.mocked(mockZip.default.zipFolder).mockResolvedValue(testBuffer);
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
      .post(`/v1/apps/${appId}/bundles`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: bundleId, appBuildId: 'build-789' });

    const uploadScope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/bundles/${bundleId}/files`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: 'file-123' });

    const updateScope = nock(DEFAULT_API_BASE_URL)
      .patch(`/v1/apps/${appId}/bundles/${bundleId}`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, { id: bundleId });

    await uploadCommand.action(options, undefined);

    expect(appScope.isDone()).toBe(true);
    expect(bundleScope.isDone()).toBe(true);
    expect(uploadScope.isDone()).toBe(true);
    expect(updateScope.isDone()).toBe(true);
    expect(mockConsola.info).toHaveBeenCalledWith(`Build Artifact ID: ${bundleId}`);
    expect(mockConsola.success).toHaveBeenCalledWith('Live Update successfully uploaded.');
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
    mockIsDirectory.mockResolvedValue(true);
    mockGetFilesInDirectoryAndSubdirectories.mockResolvedValue([
      { href: 'index.html', mimeType: 'text/html', name: 'index.html', path: 'index.html' },
    ]);

    // Mock utility functions
    const mockBuffer = await import('@/utils/buffer.js');
    vi.mocked(mockBuffer.isPrivateKeyContent).mockReturnValue(false);

    await expect(uploadCommand.action(options, undefined)).rejects.toThrow('Process exited with code 1');

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

    // Mock zip utility to pass path validation
    const mockZip = await import('@/utils/zip.js');
    vi.mocked(mockZip.default.isZipped).mockReturnValue(true);

    // Mock utility functions
    const mockBuffer = await import('@/utils/buffer.js');
    vi.mocked(mockBuffer.isPrivateKeyContent).mockReturnValue(false);

    await expect(uploadCommand.action(options, undefined)).rejects.toThrow('Process exited with code 1');

    expect(mockConsola.error).toHaveBeenCalledWith(
      'Private key must be either a path to a .pem file or the private key content as plain text.',
    );
  });

  it('should handle API error during creation', async () => {
    const appId = 'app-123';
    const bundlePath = './dist';
    const testToken = 'test-token';
    const testBuffer = Buffer.from('test');

    const options = {
      appId,
      path: bundlePath,
      artifactType: 'zip' as const,
      rollout: 1,
    };

    mockFileExistsAtPath.mockResolvedValue(true);
    mockIsDirectory.mockResolvedValue(true);
    mockGetFilesInDirectoryAndSubdirectories.mockResolvedValue([
      { href: 'index.html', mimeType: 'text/html', name: 'index.html', path: 'index.html' },
    ]);

    // Mock utility functions
    const mockZip = await import('@/utils/zip.js');
    vi.mocked(mockZip.default.isZipped).mockReturnValue(false);
    vi.mocked(mockZip.default.zipFolder).mockResolvedValue(testBuffer);

    const appScope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, { id: appId, name: 'Test App' });

    const bundleScope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/bundles`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(400, { message: 'Invalid bundle data' });

    await expect(uploadCommand.action(options, undefined)).rejects.toThrow();

    expect(appScope.isDone()).toBe(true);
    expect(bundleScope.isDone()).toBe(true);
  });
});
