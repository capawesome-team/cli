import { DEFAULT_API_BASE_URL, DEFAULT_CONSOLE_BASE_URL } from '@/config/consts.js';

export type ConfigKey = 'API_BASE_URL' | 'CONSOLE_BASE_URL' | 'ENVIRONMENT';

export interface ConfigService {
  getValueForKey(key: ConfigKey): Promise<string>;
}

const SETTINGS: Record<ConfigKey, { defaultValue: string; environmentVariable: string }> = {
  API_BASE_URL: { defaultValue: DEFAULT_API_BASE_URL, environmentVariable: 'CAPAWESOME_API_BASE_URL' },
  CONSOLE_BASE_URL: { defaultValue: DEFAULT_CONSOLE_BASE_URL, environmentVariable: 'CAPAWESOME_CONSOLE_BASE_URL' },
  ENVIRONMENT: { defaultValue: 'production', environmentVariable: 'CAPAWESOME_ENVIRONMENT' },
};

/**
 * Read only from environment variables, never from files in the working directory:
 * a repository could otherwise redirect the API token and uploaded secrets to another host.
 */
class ConfigServiceImpl implements ConfigService {
  async getValueForKey(key: ConfigKey): Promise<string> {
    const { defaultValue, environmentVariable } = SETTINGS[key];
    return process.env[environmentVariable] || defaultValue;
  }
}

const configService = new ConfigServiceImpl();

export default configService;
