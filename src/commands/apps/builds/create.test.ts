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

describe('apps-builds-create', () => {
  const mockUserConfig = vi.mocked(userConfig);
  const mockAuthorizationService = vi.mocked(authorizationService);
  const mockConsola = vi.mocked(consola);

  const testToken = 'test-token';
  const appId = '00000000-0000-0000-0000-000000000001';
  const buildId = '00000000-0000-0000-0000-000000000002';
  const validAppId = '11111111-1111-4111-8111-111111111111';
  const shareId = 'share-abc';

  beforeEach(async () => {
    vi.clearAllMocks();

    mockUserConfig.read.mockReturnValue({ token: testToken });
    mockAuthorizationService.hasAuthorizationToken.mockReturnValue(true);
    mockAuthorizationService.getCurrentAuthorizationToken.mockReturnValue(testToken);

    // Mock waitForJobCompletion to resolve immediately as succeeded
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

  it('should create a share and merge it into the JSON output', async () => {
    const options = { appId, platform: 'web' as const, gitRef: 'main', share: true, json: true };

    const buildScope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/builds`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: buildId, jobId: 'job-1', numberAsString: '42' });

    const findScope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}/builds/${buildId}`)
      .query({ relations: 'appBuildArtifacts' })
      .reply(200, { id: buildId, appBuildArtifacts: [] });

    const shareScope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/builds/${buildId}/shares`, {})
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, {
        id: shareId,
        appBuildId: buildId,
        description: null,
        expiresAt: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      });

    await createCommand.action(options, undefined);

    expect(buildScope.isDone()).toBe(true);
    expect(findScope.isDone()).toBe(true);
    expect(shareScope.isDone()).toBe(true);

    const webUrl = `${DEFAULT_CONSOLE_BASE_URL}/app-build-shares/${shareId}`;
    const qrCodeUrl = `${DEFAULT_API_BASE_URL}/v1/qrcodes?content=${encodeURIComponent(webUrl)}&format=png`;
    expect(console.log).toHaveBeenCalledWith(
      JSON.stringify(
        {
          id: buildId,
          numberAsString: '42',
          appBuildShare: { id: shareId, qrCodeUrl, webUrl, expiresAt: null },
        },
        null,
        2,
      ),
    );
  });

  it('should reject --share combined with --detached', async () => {
    const options = { appId, platform: 'web' as const, gitRef: 'main', share: true, detached: true };

    await expect(createCommand.action(options, undefined)).rejects.toThrow('Process exited with code 1');

    expect(mockConsola.error).toHaveBeenCalledWith(
      'The --detached flag cannot be used with --share. Sharing requires waiting for completion.',
    );
  });

  it('should reject --share-description without --share', async () => {
    const options = { appId, platform: 'web' as const, gitRef: 'main', shareDescription: 'What to test' };

    await expect(createCommand.action(options, undefined)).rejects.toThrow('Process exited with code 1');

    expect(mockConsola.error).toHaveBeenCalledWith(
      'The --share-description and --share-expires-in-days flags require --share.',
    );
  });

  it('should reject --share-expires-in-days without --share', async () => {
    const options = { appId, platform: 'web' as const, gitRef: 'main', shareExpiresInDays: 7 };

    await expect(createCommand.action(options, undefined)).rejects.toThrow('Process exited with code 1');

    expect(mockConsola.error).toHaveBeenCalledWith(
      'The --share-description and --share-expires-in-days flags require --share.',
    );
  });

  it('should reject a non-positive shareExpiresInDays value', () => {
    const schema = createCommand.options?.schema;

    for (const shareExpiresInDays of [0, -1]) {
      const result = schema?.safeParse({
        appId: validAppId,
        platform: 'web',
        gitRef: 'main',
        share: true,
        shareExpiresInDays,
      });
      expect(result?.success).toBe(false);
      expect(result?.error?.issues[0]?.message).toBe('Expires in days must be a positive integer.');
    }
  });

  it('should accept a positive shareExpiresInDays value', () => {
    const schema = createCommand.options?.schema;

    const result = schema?.safeParse({
      appId: validAppId,
      platform: 'web',
      gitRef: 'main',
      share: true,
      shareExpiresInDays: 7,
    });
    expect(result?.success).toBe(true);
    expect(result?.data?.shareExpiresInDays).toBe(7);
  });
});
