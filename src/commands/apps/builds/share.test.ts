import { DEFAULT_API_BASE_URL, DEFAULT_CONSOLE_BASE_URL } from '@/config/consts.js';
import authorizationService from '@/services/authorization-service.js';
import userConfig from '@/utils/user-config.js';
import consola from 'consola';
import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import shareCommand from './share.js';

// Mock dependencies
vi.mock('@/utils/user-config.js');
vi.mock('@/utils/prompt.js');
vi.mock('@/services/authorization-service.js');
vi.mock('consola');

vi.mock('@/utils/environment.js', () => ({
  isInteractive: () => false,
}));

describe('apps-builds-share', () => {
  const mockUserConfig = vi.mocked(userConfig);
  const mockAuthorizationService = vi.mocked(authorizationService);
  const mockConsola = vi.mocked(consola);

  const testToken = 'test-token';
  const appId = '00000000-0000-0000-0000-000000000001';
  const buildId = '00000000-0000-0000-0000-000000000002';
  const validAppId = '11111111-1111-4111-8111-111111111111';
  const validBuildId = '22222222-2222-4222-8222-222222222222';
  const shareId = 'share-abc';

  beforeEach(() => {
    vi.clearAllMocks();

    mockUserConfig.read.mockReturnValue({ token: testToken });
    mockAuthorizationService.hasAuthorizationToken.mockReturnValue(true);
    mockAuthorizationService.getCurrentAuthorizationToken.mockReturnValue(testToken);

    vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
      throw new Error(`Process exited with code ${code}`);
    });
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
  });

  it('should create a share and output the exact JSON shape', async () => {
    const options = { appId, buildId, json: true };

    const buildScope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}/builds/${buildId}`)
      .query({ relations: 'job' })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, { id: buildId, job: { id: 'job-1', status: 'succeeded' } });

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

    await shareCommand.action(options, undefined);

    expect(buildScope.isDone()).toBe(true);
    expect(shareScope.isDone()).toBe(true);

    const webUrl = `${DEFAULT_CONSOLE_BASE_URL}/app-build-shares/${shareId}`;
    const qrCodeUrl = `${DEFAULT_API_BASE_URL}/v1/qrcodes?content=${encodeURIComponent(webUrl)}&format=png`;
    expect(console.log).toHaveBeenCalledWith(
      JSON.stringify({ id: shareId, qrCodeUrl, webUrl, expiresAt: null }, null, 2),
    );
    expect(mockConsola.success).not.toHaveBeenCalled();
  });

  it('should compute expiresAt from expiresInDays', async () => {
    const expiresInDays = 7;
    const options = { appId, buildId, expiresInDays, json: true };

    nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}/builds/${buildId}`)
      .query({ relations: 'job' })
      .reply(200, { id: buildId, job: { id: 'job-1', status: 'succeeded' } });

    let capturedBody: { expiresAt?: string } = {};
    nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/builds/${buildId}/shares`, (body) => {
        capturedBody = body;
        return true;
      })
      .reply(201, {
        id: shareId,
        appBuildId: buildId,
        description: null,
        expiresAt: capturedBody.expiresAt ?? null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      });

    const before = Date.now();
    await shareCommand.action(options, undefined);
    const after = Date.now();

    expect(capturedBody.expiresAt).toBeDefined();
    const expiresAtMs = new Date(capturedBody.expiresAt as string).getTime();
    const millisPerDay = 24 * 60 * 60 * 1000;
    expect(expiresAtMs).toBeGreaterThanOrEqual(before + expiresInDays * millisPerDay);
    expect(expiresAtMs).toBeLessThanOrEqual(after + expiresInDays * millisPerDay);
  });

  it('should error when the build has not succeeded', async () => {
    const options = { appId, buildId, json: true };

    const buildScope = nock(DEFAULT_API_BASE_URL)
      .get(`/v1/apps/${appId}/builds/${buildId}`)
      .query({ relations: 'job' })
      .reply(200, { id: buildId, job: { id: 'job-1', status: 'in_progress' } });

    await expect(shareCommand.action(options, undefined)).rejects.toThrow('Process exited with code 1');

    expect(buildScope.isDone()).toBe(true);
    expect(mockConsola.error).toHaveBeenCalledWith(
      'The build has not succeeded yet. Only successful builds can be shared.',
    );
  });

  it('should require app ID in non-interactive mode', async () => {
    const options = { buildId };

    await expect(shareCommand.action(options, undefined)).rejects.toThrow('Process exited with code 1');

    expect(mockConsola.error).toHaveBeenCalledWith(
      'You must provide an app ID when running in non-interactive environment.',
    );
  });

  it('should require build ID in non-interactive mode', async () => {
    const options = { appId };

    await expect(shareCommand.action(options, undefined)).rejects.toThrow('Process exited with code 1');

    expect(mockConsola.error).toHaveBeenCalledWith(
      'You must provide a build ID when running in non-interactive environment.',
    );
  });

  it('should reject a non-positive expiresInDays value', () => {
    const schema = shareCommand.options?.schema;

    for (const expiresInDays of [0, -1]) {
      const result = schema?.safeParse({ appId: validAppId, buildId: validBuildId, expiresInDays });
      expect(result?.success).toBe(false);
      expect(result?.error?.issues[0]?.message).toBe('Expires in days must be a positive integer.');
    }
  });

  it('should accept a positive expiresInDays value', () => {
    const schema = shareCommand.options?.schema;

    const result = schema?.safeParse({ appId: validAppId, buildId: validBuildId, expiresInDays: 7 });
    expect(result?.success).toBe(true);
    expect(result?.data?.expiresInDays).toBe(7);
  });
});
