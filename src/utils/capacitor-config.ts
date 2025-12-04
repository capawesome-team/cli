import fs from 'fs';
import pathModule from 'path';
import { fileExistsAtPath } from './file.js';

export interface CapacitorConfig {
  webDir?: string;
  plugins?: {
    LiveUpdate?: {
      appId?: string;
    };
  };
}

/**
 * Find the Capacitor config file in the current working directory.
 * Looks for capacitor.config.json or capacitor.config.ts.
 *
 * @returns The path to the config file, or undefined if not found.
 */
export const findCapacitorConfigPath = async (): Promise<string | undefined> => {
  const cwd = process.cwd();
  const jsonPath = pathModule.join(cwd, 'capacitor.config.json');
  const tsPath = pathModule.join(cwd, 'capacitor.config.ts');

  if (await fileExistsAtPath(jsonPath)) {
    return jsonPath;
  }
  if (await fileExistsAtPath(tsPath)) {
    return tsPath;
  }
  return undefined;
};

/**
 * Read and parse the Capacitor config file.
 *
 * @param configPath The path to the config file.
 * @returns The parsed config object, or undefined if parsing fails.
 */
export const readCapacitorConfig = async (configPath: string): Promise<CapacitorConfig | undefined> => {
  try {
    if (configPath.endsWith('.json')) {
      const content = await fs.promises.readFile(configPath, 'utf-8');
      return JSON.parse(content);
    } else if (configPath.endsWith('.ts')) {
      // For TypeScript config, parse as text and extract values
      const content = await fs.promises.readFile(configPath, 'utf-8');

      // Extract webDir using regex
      const webDirMatch = content.match(/webDir:\s*['"]([^'"]+)['"]/);
      const appIdMatch = content.match(/LiveUpdate:\s*{[^}]*appId:\s*['"]([^'"]+)['"]/s);

      const config: CapacitorConfig = {};
      if (webDirMatch) {
        config.webDir = webDirMatch[1];
      }
      if (appIdMatch) {
        config.plugins = {
          LiveUpdate: {
            appId: appIdMatch[1],
          },
        };
      }

      return Object.keys(config).length > 0 ? config : undefined;
    }
  } catch (error) {
    // Return undefined if parsing fails
  }
  return undefined;
};

/**
 * Get the webDir from the Capacitor config.
 * Returns the absolute path to the webDir.
 *
 * @param configPath The path to the config file.
 * @returns The absolute path to the webDir, or undefined if not found.
 */
export const getWebDirFromConfig = async (configPath: string): Promise<string | undefined> => {
  const config = await readCapacitorConfig(configPath);
  if (config?.webDir) {
    // Resolve the webDir relative to the config file location
    const configDir = pathModule.dirname(configPath);
    return pathModule.resolve(configDir, config.webDir);
  }
  return undefined;
};

/**
 * Get the LiveUpdate appId from the Capacitor config.
 *
 * @param configPath The path to the config file.
 * @returns The appId, or undefined if not found.
 */
export const getLiveUpdateAppIdFromConfig = async (configPath: string): Promise<string | undefined> => {
  const config = await readCapacitorConfig(configPath);
  return config?.plugins?.LiveUpdate?.appId;
};
