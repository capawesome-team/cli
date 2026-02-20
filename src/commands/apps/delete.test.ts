import { DEFAULT_API_BASE_URL } from '@/config/consts.js';
import authorizationService from '@/services/authorization-service.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import userConfig from '@/utils/user-config.js';
import consola from 'consola';
import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import deleteAppCommand from './delete.js';

// Mock dependencies
vi.mock('@/utils/user-config.js');
vi.mock('@/utils/prompt.js');
vi.mock('@/services/authorization-service.js');
vi.mock('consola');
vi.mock('@/utils/environment.js', () => ({
  isInteractive: () => true,
}));

describe('apps-delete', () => {
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

  it('should delete app with provided appId after confirmation', async () => {
    const appId = 'app-123';
    const testToken = 'test-token';

    const options = { appId };

    mockPrompt.mockResolvedValueOnce(true); // confirmation

    const scope = nock(DEFAULT_API_BASE_URL)
      .delete(`/v1/apps/${appId}`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200);

    await deleteAppCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockPrompt).toHaveBeenCalledWith('Are you sure you want to delete this app?', {
      type: 'confirm',
    });
    expect(mockConsola.success).toHaveBeenCalledWith('App deleted successfully.');
  });

  it('should not delete app when confirmation is declined', async () => {
    const appId = 'app-123';

    const options = { appId };

    mockPrompt.mockResolvedValueOnce(false); // declined confirmation

    await deleteAppCommand.action(options, undefined);

    expect(mockPrompt).toHaveBeenCalledWith('Are you sure you want to delete this app?', {
      type: 'confirm',
    });
    expect(mockConsola.success).not.toHaveBeenCalled();
  });

  it('should prompt for app selection when appId not provided', async () => {
    const orgId = 'org-1';
    const appId = 'app-1';
    const testToken = 'test-token';

    const options = {};

    const deleteScope = nock(DEFAULT_API_BASE_URL)
      .delete(`/v1/apps/${appId}`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(200);

    mockPromptOrganizationSelection.mockResolvedValueOnce(orgId);
    mockPromptAppSelection.mockResolvedValueOnce(appId);
    mockPrompt.mockResolvedValueOnce(true); // confirmation

    await deleteAppCommand.action(options, undefined);

    expect(deleteScope.isDone()).toBe(true);
    expect(mockConsola.success).toHaveBeenCalledWith('App deleted successfully.');
  });

  it('should exit when promptOrganizationSelection exits', async () => {
    const options = {};

    mockPromptOrganizationSelection.mockImplementation(() => {
      process.exit(1);
      return Promise.resolve('');
    });

    await expect(deleteAppCommand.action(options, undefined)).rejects.toThrow('Process exited with code 1');
  });

  it('should handle API error during deletion', async () => {
    const appId = 'app-123';
    const testToken = 'test-token';

    const options = { appId };

    mockPrompt.mockResolvedValueOnce(true);

    const scope = nock(DEFAULT_API_BASE_URL)
      .delete(`/v1/apps/${appId}`)
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(404, { message: 'App not found' });

    await expect(deleteAppCommand.action(options, undefined)).rejects.toThrow();

    expect(scope.isDone()).toBe(true);
  });
});
