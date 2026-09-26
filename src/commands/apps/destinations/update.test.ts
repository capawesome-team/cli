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

  it('should clear the Firebase tester groups when an empty value is passed', async () => {
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
});
