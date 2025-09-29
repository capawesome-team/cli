import { DEFAULT_API_BASE_URL } from '@/config/consts.js';
import authorizationService from '@/services/authorization-service.js';
import { prompt } from '@/utils/prompt.js';
import userConfig from '@/utils/user-config.js';
import consola from 'consola';
import nock from 'nock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import createOrganizationCommand from './create.js';

// Mock dependencies
vi.mock('@/utils/user-config.js');
vi.mock('@/utils/prompt.js');
vi.mock('@/services/authorization-service.js');
vi.mock('consola');
vi.mock('std-env', () => ({
  hasTTY: true,
}));

describe('organizations-create', () => {
  const mockUserConfig = vi.mocked(userConfig);
  const mockPrompt = vi.mocked(prompt);
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

  it('should create organization with provided name', async () => {
    const organizationName = 'Test Organization';
    const organizationId = 'org-456';
    const testToken = 'test-token';

    const options = { name: organizationName };

    const scope = nock(DEFAULT_API_BASE_URL)
      .post('/v1/organizations', { name: organizationName })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: organizationId, name: organizationName });

    await createOrganizationCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockConsola.success).toHaveBeenCalledWith('Organization created successfully.');
    expect(mockConsola.info).toHaveBeenCalledWith(`Organization ID: ${organizationId}`);
  });

  it('should prompt for organization name when not provided', async () => {
    const promptedOrganizationName = 'Prompted Organization';
    const organizationId = 'org-456';
    const testToken = 'test-token';

    const options = {};

    const scope = nock(DEFAULT_API_BASE_URL)
      .post('/v1/organizations', { name: promptedOrganizationName })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(201, { id: organizationId, name: promptedOrganizationName });

    mockPrompt.mockResolvedValueOnce(promptedOrganizationName);

    await createOrganizationCommand.action(options, undefined);

    expect(scope.isDone()).toBe(true);
    expect(mockPrompt).toHaveBeenCalledWith('Enter the name of the organization:', { type: 'text' });
    expect(mockConsola.success).toHaveBeenCalledWith('Organization created successfully.');
    expect(mockConsola.info).toHaveBeenCalledWith(`Organization ID: ${organizationId}`);
  });

  it('should exit when not logged in', async () => {
    const organizationName = 'Test Organization';
    const options = { name: organizationName };

    mockAuthorizationService.hasAuthorizationToken.mockReturnValue(false);

    await expect(createOrganizationCommand.action(options, undefined)).rejects.toThrow('Process exited with code 1');

    expect(mockConsola.error).toHaveBeenCalledWith('You must be logged in to run this command.');
  });

  it('should handle API error during creation', async () => {
    const organizationName = 'Test Organization';
    const testToken = 'test-token';

    const options = { name: organizationName };

    const scope = nock(DEFAULT_API_BASE_URL)
      .post('/v1/organizations', { name: organizationName })
      .matchHeader('Authorization', `Bearer ${testToken}`)
      .reply(400, { message: 'Organization name already exists' });

    await expect(createOrganizationCommand.action(options, undefined)).rejects.toThrow();

    expect(scope.isDone()).toBe(true);
  });
});
