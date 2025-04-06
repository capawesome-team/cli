import { loadConfig, UserInputConfig } from 'c12';

export interface ConfigService {
  getValueForKey(key: string): Promise<string>;
}

class ConfigServiceImpl implements ConfigService {
  private readonly config: Promise<UserInputConfig>;

  constructor() {
    this.config = this.loadConfig();
  }

  async getValueForKey(key: string): Promise<string> {
    return (await this.config)[key];
  }

  private async loadConfig(): Promise<UserInputConfig> {
    const { config } = await loadConfig({
      defaults: {
        API_BASE_URL: 'https://api.cloud.capawesome.io',
        CONSOLE_BASE_URL: 'https://console.cloud.capawesome.io',
        ENVIRONMENT: 'production',
      },
      name: 'capawesome',
    });
    return config;
  }
}

const configService = new ConfigServiceImpl();

export default configService;
