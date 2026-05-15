import { pathExists } from '@/utils/file.js';
import { loadConfig } from 'c12';
import pathModule from 'path';
import type { AppTypeAdapter, FingerprintPlatform } from '../types.js';

const CAPACITOR_CONFIG_FILES = ['capacitor.config.ts', 'capacitor.config.json', 'capacitor.config.js'];

interface CapacitorConfig {
  android?: { path?: string };
  ios?: { path?: string };
}

const findConfigFile = async (projectRoot: string): Promise<string | undefined> => {
  for (const fileName of CAPACITOR_CONFIG_FILES) {
    const absolutePath = pathModule.join(projectRoot, fileName);
    if (await pathExists(absolutePath)) {
      return absolutePath;
    }
  }
  return undefined;
};

const loadCapacitorConfig = async (projectRoot: string): Promise<CapacitorConfig> => {
  const { config } = await loadConfig<CapacitorConfig>({
    name: 'capacitor',
    cwd: projectRoot,
    rcFile: false,
    globalRc: false,
    dotenv: false,
    packageJson: false,
  });
  return config ?? {};
};

const capacitorAdapter: AppTypeAdapter = {
  name: 'capacitor',
  async detect(projectRoot) {
    const configFile = await findConfigFile(projectRoot);
    return configFile !== undefined;
  },
  async resolvePlatformDir(projectRoot, platform: FingerprintPlatform) {
    const config = await loadCapacitorConfig(projectRoot);
    const customPath = platform === 'android' ? config.android?.path : config.ios?.path;
    const relativePath = customPath ?? platform;
    return pathModule.resolve(projectRoot, relativePath);
  },
  async getAdditionalSources(projectRoot) {
    const sources: string[] = [];
    const configFile = await findConfigFile(projectRoot);
    if (configFile) {
      sources.push(configFile);
    }
    return sources;
  },
};

export default capacitorAdapter;
