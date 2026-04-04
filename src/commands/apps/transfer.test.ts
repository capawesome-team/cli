import { DEFAULT_API_BASE_URL } from '@/config/consts.js';
import authorizationService from '@/services/authorization-service.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import userConfig from '@/utils/user-config.js';
import consola from 'consola';
import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import transferAppCommand from './transfer.js';

vi.mock('@/utils/user-config.js');
vi.mock('@/utils/prompt.js');
vi.mock('@/services/authorization-service.js');
vi.mock('consola');
vi.mock('@/utils/environment.js', () => ({
  isInteractive: () => true,
}));

describe('apps-transfer', () => {
  const mockUserConfig = vi.mocked(userConfig);
  const mockPrompt = vi.mocked(prompt);
  const mockPromptOrganizationSelection = vi.mocked(promptOrganizationSelection);
  const mockPromptAppSelection = vi.mocked(promptAppSelection);
  const mockConsola = vi.mocked(consola);
  const mockAuthorizationService = vi.mocked(authorizationService);

  beforeEach(() => {
    vi.clearAllMocks();

    mockUserConfig.read.mockReturnValue({ token: 'test-token' });
    mockAuthorizationService.getCurrentAuthorizationToken.mockReturnValue('test-token');
    mockAuthorizationService.hasAuthorizationToken.mockReturnValue(true);

    vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
      throw new Error(`Process exited with code ${code}`);
    });
  });

  afterEach(() => {
    nock.cleanAll();
    vi.restoreAllMocks();
  });

  it('should transfer app with provided options after confirmation', async () => {
    const appId = 'app-123';
    const organizationId = 'org-456';
    const testToken = 'test-token';

    const options = { appId, organizationId };

    mockPrompt.mockResolvedValueOnce(true);

    const scope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/transfer`, { organizationId })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, { id: appId, name: 'Test App' });

    await transferAppCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockPrompt).toHaveBeenCalledWith('Are you sure you want to transfer this app?', {
      type: 'confirm',
    });
    expect(mockConsola.success).toHaveBeenCalledWith('App transferred successfully.');
  });

  it('should not transfer app when confirmation is declined', async () => {
    const appId = 'app-123';
    const organizationId = 'org-456';

    const options = { appId, organizationId };

    mockPrompt.mockResolvedValueOnce(false);

    await transferAppCommand.action(options, undefined);

    expect(mockPrompt).toHaveBeenCalledWith('Are you sure you want to transfer this app?', {
      type: 'confirm',
    });
    expect(mockConsola.success).not.toHaveBeenCalled();
  });

  it('should prompt for app selection when appId not provided', async () => {
    const orgId = 'org-1';
    const appId = 'app-1';
    const targetOrgId = 'org-2';
    const testToken = 'test-token';

    const options = { organizationId: targetOrgId };

    const scope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/transfer`, { organizationId: targetOrgId })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, { id: appId, name: 'Test App' });

    mockPromptOrganizationSelection.mockResolvedValueOnce(orgId);
    mockPromptAppSelection.mockResolvedValueOnce(appId);
    mockPrompt.mockResolvedValueOnce(true);

    await transferAppCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockConsola.success).toHaveBeenCalledWith('App transferred successfully.');
  });

  it('should prompt for organization selection when organizationId not provided', async () => {
    const appId = 'app-123';
    const targetOrgId = 'org-456';
    const testToken = 'test-token';

    const options = { appId };

    const scope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/transfer`, { organizationId: targetOrgId })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200, { id: appId, name: 'Test App' });

    mockPromptOrganizationSelection.mockResolvedValueOnce(targetOrgId);
    mockPrompt.mockResolvedValueOnce(true);

    await transferAppCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockConsola.success).toHaveBeenCalledWith('App transferred successfully.');
  });

  it('should handle API error during transfer', async () => {
    const appId = 'app-123';
    const organizationId = 'org-456';
    const testToken = 'test-token';

    const options = { appId, organizationId };

    mockPrompt.mockResolvedValueOnce(true);

    const scope = nock(DEFAULT_API_BASE_URL)
      .post(`/v1/apps/${appId}/transfer`, { organizationId })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(400, { message: 'Target organization has reached its app limit.' });

    await expect(transferAppCommand.action(options, undefined)).rejects.toThrow();

    expect(scope.isDone()).toBe(true);
  });
});
