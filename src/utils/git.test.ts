import { describe, expect, it } from 'vitest';
import { parseGitRemoteUrl } from './git.js';

describe('parseGitRemoteUrl', () => {
  it('should parse GitHub HTTPS URL', () => {
    const result = parseGitRemoteUrl('https://github.com/capawesome-team/cli.git');
    expect(result).toEqual({
      ownerSlug: 'capawesome-team',
      provider: 'github',
      repositorySlug: 'cli',
    });
  });

  it('should parse GitHub HTTPS URL without .git suffix', () => {
    const result = parseGitRemoteUrl('https://github.com/capawesome-team/cli');
    expect(result).toEqual({
      ownerSlug: 'capawesome-team',
      provider: 'github',
      repositorySlug: 'cli',
    });
  });

  it('should parse GitHub SSH URL', () => {
    const result = parseGitRemoteUrl('git@github.com:capawesome-team/cli.git');
    expect(result).toEqual({
      ownerSlug: 'capawesome-team',
      provider: 'github',
      repositorySlug: 'cli',
    });
  });

  it('should parse GitHub SSH URL without .git suffix', () => {
    const result = parseGitRemoteUrl('git@github.com:capawesome-team/cli');
    expect(result).toEqual({
      ownerSlug: 'capawesome-team',
      provider: 'github',
      repositorySlug: 'cli',
    });
  });

  it('should parse GitLab HTTPS URL', () => {
    const result = parseGitRemoteUrl('https://gitlab.com/my-group/my-repo.git');
    expect(result).toEqual({
      ownerSlug: 'my-group',
      provider: 'gitlab',
      repositorySlug: 'my-repo',
    });
  });

  it('should parse GitLab SSH URL', () => {
    const result = parseGitRemoteUrl('git@gitlab.com:my-group/my-repo.git');
    expect(result).toEqual({
      ownerSlug: 'my-group',
      provider: 'gitlab',
      repositorySlug: 'my-repo',
    });
  });

  it('should parse GitLab HTTPS URL with subgroup', () => {
    const result = parseGitRemoteUrl('https://gitlab.com/my-group/my-subgroup/my-repo.git');
    expect(result).toEqual({
      ownerSlug: 'my-group',
      provider: 'gitlab',
      repositorySlug: 'my-repo',
      projectSlug: 'my-subgroup',
    });
  });

  it('should parse GitLab SSH URL with subgroup', () => {
    const result = parseGitRemoteUrl('git@gitlab.com:my-group/my-subgroup/my-repo.git');
    expect(result).toEqual({
      ownerSlug: 'my-group',
      provider: 'gitlab',
      repositorySlug: 'my-repo',
      projectSlug: 'my-subgroup',
    });
  });

  it('should parse Bitbucket HTTPS URL', () => {
    const result = parseGitRemoteUrl('https://bitbucket.org/my-team/my-repo.git');
    expect(result).toEqual({
      ownerSlug: 'my-team',
      provider: 'bitbucket',
      repositorySlug: 'my-repo',
    });
  });

  it('should parse Bitbucket SSH URL', () => {
    const result = parseGitRemoteUrl('git@bitbucket.org:my-team/my-repo.git');
    expect(result).toEqual({
      ownerSlug: 'my-team',
      provider: 'bitbucket',
      repositorySlug: 'my-repo',
    });
  });

  it('should parse Azure DevOps HTTPS URL', () => {
    const result = parseGitRemoteUrl('https://dev.azure.com/my-org/my-project/_git/my-repo');
    expect(result).toEqual({
      ownerSlug: 'my-org',
      provider: 'azure',
      repositorySlug: 'my-repo',
      projectSlug: 'my-project',
    });
  });

  it('should parse Azure DevOps SSH URL', () => {
    const result = parseGitRemoteUrl('git@ssh.dev.azure.com:v3/my-org/my-project/my-repo');
    expect(result).toEqual({
      ownerSlug: 'my-org',
      provider: 'azure',
      repositorySlug: 'my-repo',
      projectSlug: 'my-project',
    });
  });

  it('should parse Visual Studio HTTPS URL', () => {
    const result = parseGitRemoteUrl('https://my-org.visualstudio.com/my-project/_git/my-repo');
    expect(result).toEqual({
      ownerSlug: 'my-org',
      provider: 'azure',
      repositorySlug: 'my-repo',
      projectSlug: 'my-project',
    });
  });

  it('should parse GitHub HTTPS URL with credentials', () => {
    const result = parseGitRemoteUrl('https://x-access-token:ghp_secret123@github.com/capawesome-team/cli.git');
    expect(result).toEqual({
      ownerSlug: 'capawesome-team',
      provider: 'github',
      repositorySlug: 'cli',
    });
  });

  it('should throw for unsupported hostname', () => {
    expect(() => parseGitRemoteUrl('https://example.com/owner/repo.git')).toThrow(
      'Unsupported git provider for hostname "example.com".',
    );
  });

  it('should not leak credentials in error messages', () => {
    expect(() => parseGitRemoteUrl('https://token@example.com/owner/repo.git')).toThrow(
      'Unsupported git provider for hostname "example.com".',
    );
  });

  it('should throw for unparseable URL', () => {
    expect(() => parseGitRemoteUrl('not-a-url')).toThrow('Could not parse git remote URL.');
  });
});
