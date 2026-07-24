import { describe, expect, it } from 'vitest';
import { GitConnectionDto } from '@/types/git-connection.js';
import { getGitConnectionHost, parseGitRemoteUrl } from './git.js';

describe('parseGitRemoteUrl', () => {
  it('should parse GitHub HTTPS URL', () => {
    const result = parseGitRemoteUrl('https://github.com/capawesome-team/cli.git');
    expect(result).toEqual({
      host: 'github.com',
      path: 'capawesome-team/cli',
    });
  });

  it('should parse GitHub HTTPS URL without .git suffix', () => {
    const result = parseGitRemoteUrl('https://github.com/capawesome-team/cli');
    expect(result).toEqual({
      host: 'github.com',
      path: 'capawesome-team/cli',
    });
  });

  it('should parse GitHub SSH URL', () => {
    const result = parseGitRemoteUrl('git@github.com:capawesome-team/cli.git');
    expect(result).toEqual({
      host: 'github.com',
      path: 'capawesome-team/cli',
    });
  });

  it('should parse GitHub SSH URL without .git suffix', () => {
    const result = parseGitRemoteUrl('git@github.com:capawesome-team/cli');
    expect(result).toEqual({
      host: 'github.com',
      path: 'capawesome-team/cli',
    });
  });

  it('should parse GitLab HTTPS URL with subgroup', () => {
    const result = parseGitRemoteUrl('https://gitlab.com/my-group/my-subgroup/my-repo.git');
    expect(result).toEqual({
      host: 'gitlab.com',
      path: 'my-group/my-subgroup/my-repo',
    });
  });

  it('should parse GitLab SSH URL with subgroup', () => {
    const result = parseGitRemoteUrl('git@gitlab.com:my-group/my-subgroup/my-repo.git');
    expect(result).toEqual({
      host: 'gitlab.com',
      path: 'my-group/my-subgroup/my-repo',
    });
  });

  it('should parse Bitbucket HTTPS URL', () => {
    const result = parseGitRemoteUrl('https://bitbucket.org/my-team/my-repo.git');
    expect(result).toEqual({
      host: 'bitbucket.org',
      path: 'my-team/my-repo',
    });
  });

  it('should parse Bitbucket SSH URL', () => {
    const result = parseGitRemoteUrl('git@bitbucket.org:my-team/my-repo.git');
    expect(result).toEqual({
      host: 'bitbucket.org',
      path: 'my-team/my-repo',
    });
  });

  it('should parse Azure DevOps HTTPS URL', () => {
    const result = parseGitRemoteUrl('https://dev.azure.com/my-org/my-project/_git/my-repo');
    expect(result).toEqual({
      host: 'dev.azure.com',
      path: 'my-org/my-project/my-repo',
    });
  });

  it('should parse Azure DevOps SSH URL', () => {
    const result = parseGitRemoteUrl('git@ssh.dev.azure.com:v3/my-org/my-project/my-repo');
    expect(result).toEqual({
      host: 'dev.azure.com',
      path: 'my-org/my-project/my-repo',
    });
  });

  it('should parse Visual Studio HTTPS URL', () => {
    const result = parseGitRemoteUrl('https://my-org.visualstudio.com/my-project/_git/my-repo');
    expect(result).toEqual({
      host: 'dev.azure.com',
      path: 'my-org/my-project/my-repo',
    });
  });

  it('should parse GitHub HTTPS URL with credentials', () => {
    const result = parseGitRemoteUrl('https://x-access-token:ghp_secret123@github.com/capawesome-team/cli.git');
    expect(result).toEqual({
      host: 'github.com',
      path: 'capawesome-team/cli',
    });
  });

  it('should parse self-hosted HTTPS URL', () => {
    const result = parseGitRemoteUrl('https://gitea.example.com/owner/repo.git');
    expect(result).toEqual({
      host: 'gitea.example.com',
      path: 'owner/repo',
    });
  });

  it('should return undefined for unparseable URL', () => {
    expect(parseGitRemoteUrl('not-a-url')).toBeUndefined();
  });
});

describe('getGitConnectionHost', () => {
  const createGitConnection = (overrides: Partial<GitConnectionDto>): GitConnectionDto => ({
    id: 'gc-1',
    appId: null,
    authKind: 'token',
    baseUrl: null,
    name: 'My Connection',
    organizationId: 'org-1',
    provider: 'github',
    ...overrides,
  });

  it('should return the default host for cloud providers', () => {
    expect(getGitConnectionHost(createGitConnection({ provider: 'github' }))).toBe('github.com');
    expect(getGitConnectionHost(createGitConnection({ provider: 'gitlab' }))).toBe('gitlab.com');
    expect(getGitConnectionHost(createGitConnection({ provider: 'bitbucket' }))).toBe('bitbucket.org');
    expect(getGitConnectionHost(createGitConnection({ provider: 'azure_devops' }))).toBe('dev.azure.com');
  });

  it('should return the base URL host for self-hosted connections', () => {
    const result = getGitConnectionHost(
      createGitConnection({ provider: 'gitea', baseUrl: 'https://gitea.example.com' }),
    );
    expect(result).toBe('gitea.example.com');
  });

  it('should return undefined for git_http connections', () => {
    expect(getGitConnectionHost(createGitConnection({ provider: 'git_http' }))).toBeUndefined();
  });
});
