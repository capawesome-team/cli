import { fileExistsAtPath } from './file.js';
import fs from 'fs';
import pathModule from 'path';

export interface PackageJson {
  scripts?: {
    [key: string]: string;
  };
  dependencies?: {
    [key: string]: string;
  };
  devDependencies?: {
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

/**
 * Check if a package is installed.
 * Checks both dependencies and devDependencies.
 *
 * @param packageJsonPath The path to the package.json file.
 * @param packageName The name of the package to check.
 * @returns True if the package is installed, false otherwise.
 */
export const isPackageInstalled = async (packageJsonPath: string, packageName: string): Promise<boolean> => {
  const packageJson = await readPackageJson(packageJsonPath);
  if (!packageJson) {
    return false;
  }

  return !!(packageJson.dependencies?.[packageName] || packageJson.devDependencies?.[packageName]);
};

/**
 * Get the Capacitor CLI version from package.json.
 *
 * @param packageJsonPath The path to the package.json file.
 * @returns The Capacitor major version number, or undefined if not found.
 */
export const getCapacitorMajorVersion = async (packageJsonPath: string): Promise<number | undefined> => {
  const packageJson = await readPackageJson(packageJsonPath);
  if (!packageJson) {
    return undefined;
  }

  const capacitorVersion =
    packageJson.dependencies?.['@capacitor/core'] || packageJson.devDependencies?.['@capacitor/core'];

  if (!capacitorVersion) {
    return undefined;
  }

  // Extract major version from version string (e.g., "^5.0.0" -> 5, "~6.1.0" -> 6)
  const match = capacitorVersion.match(/(\d+)/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }

  return undefined;
};
