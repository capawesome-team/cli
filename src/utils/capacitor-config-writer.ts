import fs from 'fs';
import { CapacitorConfig, readCapacitorConfig } from './capacitor-config.js';
import { writeFile } from './file.js';

/**
 * Deep merge two objects.
 */
const deepMerge = <T extends Record<string, any>>(target: T, source: Partial<T>): T => {
  const result = { ...target };

  for (const key in source) {
    if (source[key] !== undefined) {
      if (typeof source[key] === 'object' && !Array.isArray(source[key]) && source[key] !== null) {
        result[key] = deepMerge(result[key] || ({} as any), source[key] as any);
      } else {
        result[key] = source[key] as any;
      }
    }
  }

  return result;
};

/**
 * Convert a value to a JavaScript object notation string.
 */
const toJSObjectString = (value: any, indent: number = 0): string => {
  const indentStr = '  '.repeat(indent);
  const nextIndentStr = '  '.repeat(indent + 1);

  if (value === null) {
    return 'null';
  }

  if (value === undefined) {
    return 'undefined';
  }

  if (typeof value === 'string') {
    // Handle multi-line strings (like public keys)
    if (value.includes('\n')) {
      // Use template literal for multi-line strings
      return `\`${value}\``;
    }
    return `'${value.replace(/'/g, "\\'")}'`;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return '[]';
    }
    const items = value.map((item) => `${nextIndentStr}${toJSObjectString(item, indent + 1)}`).join(',\n');
    return `[\n${items}\n${indentStr}]`;
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      return '{}';
    }
    const items = keys
      .map((key) => {
        const val = toJSObjectString(value[key], indent + 1);
        return `${nextIndentStr}${key}: ${val}`;
      })
      .join(',\n');
    return `{\n${items}\n${indentStr}}`;
  }

  return 'undefined';
};

/**
 * Write a Capacitor config to a JSON file.
 */
export const writeCapacitorConfigJson = async (configPath: string, config: CapacitorConfig): Promise<void> => {
  const jsonContent = JSON.stringify(config, null, 2);
  await writeFile(configPath, jsonContent);
};

/**
 * Write a Capacitor config to a TypeScript file.
 */
export const writeCapacitorConfigTs = async (configPath: string, config: CapacitorConfig): Promise<void> => {
  // Read existing file to preserve reference comments
  const existingContent = await fs.promises.readFile(configPath, 'utf-8');

  // Extract reference comments
  const referenceComments: string[] = [];
  const lines = existingContent.split('\n');
  for (const line of lines) {
    if (line.trim().startsWith('///')) {
      referenceComments.push(line.trim());
    }
  }

  // Generate TypeScript content
  const configObject = toJSObjectString(config, 0);

  const tsContent = [
    ...referenceComments,
    ...(referenceComments.length > 0 ? [''] : []),
    "import type { CapacitorConfig } from '@capacitor/cli';",
    '',
    'const config: CapacitorConfig = ' + configObject + ';',
    '',
    'export default config;',
    '',
  ].join('\n');

  await writeFile(configPath, tsContent);
};

/**
 * Update a Capacitor config file with partial updates.
 * Performs a deep merge with existing config.
 */
export const updateCapacitorConfig = async (configPath: string, updates: Partial<CapacitorConfig>): Promise<void> => {
  // Read current config
  let currentConfig = await readCapacitorConfig(configPath);
  if (!currentConfig) {
    currentConfig = {};
  }

  // Merge updates
  const mergedConfig = deepMerge(currentConfig, updates);

  // Write based on file type
  if (configPath.endsWith('.json')) {
    await writeCapacitorConfigJson(configPath, mergedConfig);
  } else if (configPath.endsWith('.ts')) {
    await writeCapacitorConfigTs(configPath, mergedConfig);
  } else {
    throw new Error('Unsupported config file format');
  }
};
