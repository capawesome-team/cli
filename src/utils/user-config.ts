import { getCodeFromUnknownError, UserError } from '@/utils/error.js';
import { readUser, writeUser } from 'rc9';

export interface IUserConfig {
  token?: string;
}

export interface UserConfig {
  read(): IUserConfig;
  write(config: IUserConfig): void;
}

class UserConfigImpl implements UserConfig {
  private file = '.capawesome';

  read(): IUserConfig {
    try {
      return readUser<IUserConfig>({ name: this.file });
    } catch (error) {
      throw this.toUserErrorIfAccessDenied(error);
    }
  }

  write(config: IUserConfig): void {
    try {
      writeUser<IUserConfig>(config, { name: this.file });
    } catch (error) {
      throw this.toUserErrorIfAccessDenied(error);
    }
  }

  private toUserErrorIfAccessDenied(error: unknown): unknown {
    if (getCodeFromUnknownError(error) === 'EACCES') {
      const path = error instanceof Error && 'path' in error && typeof error.path === 'string' ? error.path : this.file;
      return new UserError(
        `Permission denied accessing ${path}. The file may be owned by another user (e.g. from a previous run with sudo). ` +
          `Try running \`sudo chown $USER ${path}\` or \`rm ${path}\`, then retry.`,
      );
    }
    return error;
  }
}

const userConfig: UserConfig = new UserConfigImpl();

export default userConfig;
