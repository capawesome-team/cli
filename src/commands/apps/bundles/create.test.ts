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

    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
  });

  it('should require authentication', async () => {
    const appId = 'app-123';
    const options = { appId, path: './dist', artifactType: 'zip' as const, rollout: 1 };

    mockAuthorizationService.hasAuthorizationToken.mockReturnValue(false);

    await createBundleCommand.action(options, undefined);

    expect(mockConsola.error).toHaveBeenCalledWith('You must be logged in to run this command.');
    expect(process.exit).toHaveBeenCalledWith(1);
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

    await createBundleCommand.action(options, undefined);

    expect(mockConsola.error).toHaveBeenCalledWith('The path does not exist.');
    expect(process.exit).toHaveBeenCalledWith(1);
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

    await createBundleCommand.action(options, undefined);

    expect(mockConsola.error).toHaveBeenCalledWith(
      'The path must be a folder when creating a bundle with an artifact type of `manifest`.',
    );
    expect(process.exit).toHaveBeenCalledWith(1);
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

    await createBundleCommand.action(options, undefined);

    expect(mockConsola.error).toHaveBeenCalledWith(
      'It is not yet possible to provide a URL when creating a bundle with an artifact type of `manifest`.',
    );
    expect(process.exit).toHaveBeenCalledWith(1);
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

    await createBundleCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockConsola.error).toHaveBeenCalled();
    expect(process.exit).toHaveBeenCalledWith(1);
  });
});
