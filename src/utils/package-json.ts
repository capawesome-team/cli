import { fileExistsAtPath } from './file.js';
import fs from 'fs';
import pathModule from 'path';

export interface PackageJson {
  scripts?: {
    [key: string]: string;
  };
}

/**
 * Find the package.json file in the current working directory.
 *
 * @returns The path to the package.json file, or undefined if not found.
 */
export const findPackageJsonPath = async (): Promise<string | undefined> => {
  const cwd = process.cwd();
  const packageJsonPath = pathModule.join(cwd, 'package.json');

  if (await fileExistsAtPath(packageJsonPath)) {
    return packageJsonPath;
  }
  return undefined;
};

/**
 * Read and parse the package.json file.
 *
 * @param packageJsonPath The path to the package.json file.
 * @returns The parsed package.json object, or undefined if parsing fails.
 */
export const readPackageJson = async (packageJsonPath: string): Promise<PackageJson | undefined> => {
  try {
    const content = await fs.promises.readFile(packageJsonPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return undefined;
  }
};

/**
 * Get the build script from package.json.
 * Prefers 'capawesome:build' over 'build' if both exist.
 *
 * @param packageJsonPath The path to the package.json file.
 * @returns An object with the script name and command, or undefined if not found.
 */
export const getBuildScript = async (
  packageJsonPath: string,
): Promise<{ name: string; command: string } | undefined> => {
  const packageJson = await readPackageJson(packageJsonPath);
  if (!packageJson?.scripts) {
    return undefined;
  }

  // Prefer 'capawesome:build' over 'build'
  if (packageJson.scripts['capawesome:build']) {
    return {
      name: 'capawesome:build',
      command: packageJson.scripts['capawesome:build'],
    };
  }

  if (packageJson.scripts['build']) {
    return {
      name: 'build',
      command: packageJson.scripts['build'],
    };
  }

  return undefined;
};
