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
    return readUser<IUserConfig>({ name: this.file });
  }

  write(config: IUserConfig): void {
    writeUser<IUserConfig>(config, { name: this.file });
  }
}

const userConfig: UserConfig = new UserConfigImpl();

export default userConfig;
