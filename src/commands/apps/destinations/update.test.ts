import { DEFAULT_API_BASE_URL } from '@/config/consts.js';
import authorizationService from '@/services/authorization-service.js';
import userConfig from '@/utils/user-config.js';
import consola from 'consola';
import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import updateDestinationCommand from './update.js';

// Mock dependencies
vi.mock('@/utils/user-config.js');
vi.mock('@/utils/prompt.js');
vi.mock('@/services/authorization-service.js');
vi.mock('consola');
vi.mock('@/utils/environment.js', () => ({
  isInteractive: () => false,
}));

describe('apps-destinations-update', () => {
  const mockUserConfig = vi.mocked(userConfig);
  const mockConsola = vi.mocked(consola);
  const mockAuthorizationService = vi.mocked(authorizationService);

  const appId = 'app-123';
  const destinationId = 'destination-456';
  const testToken = 'test-token';

  beforeEach(() => {
    vi.clearAllMocks();

    mockUserConfig.read.mockReturnValue({ token: testToken });
    mockAuthorizationService.getCurrentAuthorizationToken.mockReturnValue(testToken);
    mockAuthorizationService.hasAuthorizationToken.mockReturnValue(true);

    vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
      throw new Error(`Process exited with code ${code}`);
    });
  });

  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
  });

  it('should update the Firebase and Huawei fields', async () => {
    const options = {
      appId,
      destinationId,
      firebaseAppId: '1:123456789012:android:0a1b2c3d4e5f67890',
      firebaseTesterGroup: ['qa-team,beta-testers'],
      huaweiAppId: '112233445',
      huaweiClientId: 'client-id',
      huaweiClientSecret: 'client-secret',
    };

    const scope = nock(DEFAULT_API_BASE_URL)
      .patch(`/v1/apps/${appId}/destinations/${destinationId}`, {
        appId,
        destinationId,
        firebaseAppId: '1:123456789012:android:0a1b2c3d4e5f67890',
        firebaseTesterGroups: ['qa-team', 'beta-testers'],
        huaweiAppId: '112233445',
        huaweiClientId: 'client-id',
        huaweiClientSecret: 'client-secret',
      })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, { id: destinationId });

    await updateDestinationCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockConsola.success).toHaveBeenCalledWith('Destination updated successfully.');
  });

  it('should update the Apple submission settings', async () => {
    const options = {
      appId,
      destinationId,
      appleBetaGroup: ['External Testers,QA'],
      appleSubmitForReview: false,
      appleReleaseType: 'manual' as const,
      appleRejectIfPossible: true,
    };

    const scope = nock(DEFAULT_API_BASE_URL)
      .patch(`/v1/apps/${appId}/destinations/${destinationId}`, {
        appId,
        destinationId,
        appleBetaGroups: ['External Testers', 'QA'],
        appleRejectIfPossible: true,
        appleReleaseType: 'manual',
        appleSubmitForReview: false,
      })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, { id: destinationId });

    await updateDestinationCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
  });

  it('should update the default language', async () => {
    const options = { appId, destinationId, defaultLanguage: 'en-US' };

    const scope = nock(DEFAULT_API_BASE_URL)
      .patch(`/v1/apps/${appId}/destinations/${destinationId}`, { appId, destinationId, defaultLanguage: 'en-US' })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, { id: destinationId });

    await updateDestinationCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
  });

  it('should clear the default language when `--default-language=` is passed', async () => {
    const options = updateDestinationCommand.options!.schema.parse({ appId, destinationId, defaultLanguage: '' });

    const scope = nock(DEFAULT_API_BASE_URL)
      .patch(`/v1/apps/${appId}/destinations/${destinationId}`, { appId, destinationId, defaultLanguage: null })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, { id: destinationId });

    await updateDestinationCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
  });

  it('should parse the boolean Apple flags from `true` and `false` values', () => {
    const schema = updateDestinationCommand.options?.schema;

    const result = schema?.safeParse({ appleSubmitForReview: 'false', appleRejectIfPossible: true });

    expect(result?.success).toBe(true);
    expect(result?.data?.appleSubmitForReview).toBe(false);
    expect(result?.data?.appleRejectIfPossible).toBe(true);
  });

  it('should reject a boolean Apple flag with an invalid value', () => {
    const schema = updateDestinationCommand.options?.schema;

    const result = schema?.safeParse({ appleSubmitForReview: 'maybe' });

    expect(result?.success).toBe(false);
    expect(result?.error?.issues[0]?.message).toBe('Apple submit for review must be either `true` or `false`.');
  });

  it('should clear the Firebase tester groups when `--firebase-tester-group=` is passed', async () => {
    const options = { appId, destinationId, firebaseTesterGroup: [''] };

    const scope = nock(DEFAULT_API_BASE_URL)
      .patch(`/v1/apps/${appId}/destinations/${destinationId}`, {
        appId,
        destinationId,
        firebaseTesterGroups: [],
      })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, { id: destinationId });

    await updateDestinationCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
  });

  it('should not send the Firebase tester groups when `--firebase-tester-group` is not passed', async () => {
    const options = { appId, destinationId, huaweiAppId: '112233445' };

    const scope = nock(DEFAULT_API_BASE_URL)
      .patch(`/v1/apps/${appId}/destinations/${destinationId}`, (body) => !('firebaseTesterGroups' in body))
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, { id: destinationId });

    await updateDestinationCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
  });
});
