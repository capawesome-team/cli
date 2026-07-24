import { execSync } from 'child_process';

export const getGitRemoteUrl = (): string | undefined => {
  try {
    return execSync('git remote get-url origin', { encoding: 'utf-8' }).trim();
  } catch {
    return undefined;
  }
};
