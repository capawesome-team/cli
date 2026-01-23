import { DEFAULT_API_BASE_URL, DEFAULT_CONSOLE_BASE_URL } from '@/config/consts.js';
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
    const isTestEnvironment = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
    const { config } = await loadConfig({
      defaults: {
        API_BASE_URL: DEFAULT_API_BASE_URL,
        CONSOLE_BASE_URL: DEFAULT_CONSOLE_BASE_URL,
        ENVIRONMENT: 'production',
      },
      name: 'capawesome',
      rcFile: isTestEnvironment ? false : undefined,
    });
    return config;
  }
}

const configService = new ConfigServiceImpl();

export default configService;
