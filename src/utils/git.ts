import { execSync } from 'child_process';

export interface GitRemoteInfo {
  ownerSlug: string;
  provider: string;
  repositorySlug: string;
  projectSlug?: string;
}

const HOSTNAME_TO_PROVIDER: Record<string, string> = {
  'github.com': 'github',
  'gitlab.com': 'gitlab',
  'bitbucket.org': 'bitbucket',
  'dev.azure.com': 'azure',
  'ssh.dev.azure.com': 'azure',
};

export const getGitRemoteInfo = (): GitRemoteInfo => {
  const remoteUrl = getGitRemoteUrl();
  return parseGitRemoteUrl(remoteUrl);
};

const getGitRemoteUrl = (): string => {
  try {
    return execSync('git remote get-url origin', { encoding: 'utf-8' }).trim();
  } catch {
    throw new Error(
      'Could not read the git remote URL. Make sure you are inside a git repository with an origin remote.',
    );
  }
};

export const parseGitRemoteUrl = (remoteUrl: string): GitRemoteInfo => {
  // Azure DevOps HTTPS: https://dev.azure.com/{org}/{project}/_git/{repo}
  const azureHttpsMatch = remoteUrl.match(/dev\.azure\.com\/([^/]+)\/([^/]+)\/_git\/([^/]+?)(?:\.git)?$/);
  if (azureHttpsMatch && azureHttpsMatch[1] && azureHttpsMatch[2] && azureHttpsMatch[3]) {
    return {
      ownerSlug: azureHttpsMatch[1],
      provider: 'azure',
      repositorySlug: azureHttpsMatch[3],
      projectSlug: azureHttpsMatch[2],
    };
  }

  // Azure DevOps SSH: git@ssh.dev.azure.com:v3/{org}/{project}/{repo}
  const azureSshMatch = remoteUrl.match(/ssh\.dev\.azure\.com:v3\/([^/]+)\/([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (azureSshMatch && azureSshMatch[1] && azureSshMatch[2] && azureSshMatch[3]) {
    return {
      ownerSlug: azureSshMatch[1],
      provider: 'azure',
      repositorySlug: azureSshMatch[3],
      projectSlug: azureSshMatch[2],
    };
  }

  // Visual Studio HTTPS: https://{org}.visualstudio.com/{project}/_git/{repo}
  const vsHttpsMatch = remoteUrl.match(/([^/]+)\.visualstudio\.com\/([^/]+)\/_git\/([^/]+?)(?:\.git)?$/);
  if (vsHttpsMatch && vsHttpsMatch[1] && vsHttpsMatch[2] && vsHttpsMatch[3]) {
    return {
      ownerSlug: vsHttpsMatch[1],
      provider: 'azure',
      repositorySlug: vsHttpsMatch[3],
      projectSlug: vsHttpsMatch[2],
    };
  }

  // SSH: git@{host}:{owner}/{repo}.git
  const sshMatch = remoteUrl.match(/git@([^:]+):([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (sshMatch && sshMatch[1] && sshMatch[2] && sshMatch[3]) {
    const hostname = sshMatch[1];
    const provider = HOSTNAME_TO_PROVIDER[hostname];
    if (!provider) {
      throw new Error(`Unsupported git provider for hostname "${hostname}".`);
    }
    return {
      ownerSlug: sshMatch[2],
      provider,
      repositorySlug: sshMatch[3],
    };
  }

  // HTTPS: https://{host}/{owner}/{repo}.git
  const httpsMatch = remoteUrl.match(/https?:\/\/([^/]+)\/([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (httpsMatch && httpsMatch[1] && httpsMatch[2] && httpsMatch[3]) {
    const hostname = httpsMatch[1];
    const provider = HOSTNAME_TO_PROVIDER[hostname];
    if (!provider) {
      throw new Error(`Unsupported git provider for hostname "${hostname}".`);
    }
    return {
      ownerSlug: httpsMatch[2],
      provider,
      repositorySlug: httpsMatch[3],
    };
  }

  throw new Error(`Could not parse git remote URL: "${remoteUrl}".`);
};
