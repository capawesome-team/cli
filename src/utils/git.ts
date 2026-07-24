import { execSync } from 'child_process';

import { GitConnectionDto } from '@/types/git-connection.js';

export interface GitRemoteInfo {
  host: string;
  path: string;
}

const PROVIDER_DEFAULT_HOSTS: Record<string, string> = {
  azure_devops: 'dev.azure.com',
  bitbucket: 'bitbucket.org',
  github: 'github.com',
  gitlab: 'gitlab.com',
};

export const getGitConnectionHost = (gitConnection: GitConnectionDto): string | undefined => {
  if (gitConnection.baseUrl) {
    try {
      return new URL(gitConnection.baseUrl).hostname;
    } catch {
      return undefined;
    }
  }
  return PROVIDER_DEFAULT_HOSTS[gitConnection.provider];
};

export const getGitRemoteInfo = (): GitRemoteInfo | undefined => {
  const remoteUrl = getGitRemoteUrl();
  if (!remoteUrl) {
    return undefined;
  }
  return parseGitRemoteUrl(remoteUrl);
};

const getGitRemoteUrl = (): string | undefined => {
  try {
    return execSync('git remote get-url origin', { encoding: 'utf-8' }).trim();
  } catch {
    return undefined;
  }
};

export const parseGitRemoteUrl = (remoteUrl: string): GitRemoteInfo | undefined => {
  // Azure DevOps HTTPS: https://dev.azure.com/{org}/{project}/_git/{repo}
  const azureHttpsMatch = remoteUrl.match(/dev\.azure\.com\/([^/]+)\/([^/]+)\/_git\/([^/]+?)(?:\.git)?$/);
  if (azureHttpsMatch && azureHttpsMatch[1] && azureHttpsMatch[2] && azureHttpsMatch[3]) {
    return {
      host: 'dev.azure.com',
      path: `${azureHttpsMatch[1]}/${azureHttpsMatch[2]}/${azureHttpsMatch[3]}`,
    };
  }

  // Azure DevOps SSH: git@ssh.dev.azure.com:v3/{org}/{project}/{repo}
  const azureSshMatch = remoteUrl.match(/ssh\.dev\.azure\.com:v3\/([^/]+)\/([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (azureSshMatch && azureSshMatch[1] && azureSshMatch[2] && azureSshMatch[3]) {
    return {
      host: 'dev.azure.com',
      path: `${azureSshMatch[1]}/${azureSshMatch[2]}/${azureSshMatch[3]}`,
    };
  }

  // Visual Studio HTTPS: https://{org}.visualstudio.com/{project}/_git/{repo}
  const vsHttpsMatch = remoteUrl.match(/([^/.]+)\.visualstudio\.com\/([^/]+)\/_git\/([^/]+?)(?:\.git)?$/);
  if (vsHttpsMatch && vsHttpsMatch[1] && vsHttpsMatch[2] && vsHttpsMatch[3]) {
    return {
      host: 'dev.azure.com',
      path: `${vsHttpsMatch[1]}/${vsHttpsMatch[2]}/${vsHttpsMatch[3]}`,
    };
  }

  // SSH: git@{host}:{owner}[/{subgroup}]/{repo}.git
  const sshMatch = remoteUrl.match(/git@([^:]+):(.+?)(?:\.git)?$/);
  if (sshMatch && sshMatch[1] && sshMatch[2] && sshMatch[2].includes('/')) {
    return {
      host: sshMatch[1],
      path: sshMatch[2],
    };
  }

  // HTTP(S): https://[user@]{host}/{owner}[/{subgroup}]/{repo}.git
  try {
    const url = new URL(remoteUrl);
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      const path = url.pathname
        .split('/')
        .filter(Boolean)
        .join('/')
        .replace(/\.git$/, '');
      if (path.includes('/')) {
        return {
          host: url.hostname,
          path,
        };
      }
    }
  } catch {
    return undefined;
  }

  return undefined;
};
