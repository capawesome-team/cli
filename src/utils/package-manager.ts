import { exec } from 'child_process';
import consola from 'consola';
import { promisify } from 'util';

const execAsync = promisify(exec);

export type PackageManager = 'npm' | 'yarn' | 'pnpm';

/**
 * Install a package using the specified package manager.
 *
 * @param packageName The name of the package to install.
 * @param packageManager The package manager to use (npm, yarn, or pnpm).
 */
export const installPackage = async (packageName: string, packageManager: PackageManager): Promise<void> => {
  const commands: Record<PackageManager, string> = {
    npm: `npm install ${packageName}`,
    yarn: `yarn add ${packageName}`,
    pnpm: `pnpm add ${packageName}`,
  };

  const command = commands[packageManager];
  consola.start(`Installing ${packageName} using ${packageManager}...`);

  try {
    const { stdout, stderr } = await execAsync(command);
    if (stdout) {
      console.log(stdout);
    }
    if (stderr) {
      console.error(stderr);
    }
  } catch (error: any) {
    consola.error(`Failed to install ${packageName}.`);
    if (error.stdout) {
      console.log(error.stdout);
    }
    if (error.stderr) {
      console.error(error.stderr);
    }
    process.exit(1);
  }
};
