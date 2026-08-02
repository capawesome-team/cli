import { getCodeFromUnknownError, UserError } from '@/utils/error.js';
import { wait } from '@/utils/wait.js';
import { execFileSync, spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const BOOT_POLL_INTERVAL_IN_MS = 2000;
const BOOT_TIMEOUT_IN_MS = 300000;

export interface AndroidEmulator {
  name: string;
  running: boolean;
  serial: string | null;
}

/**
 * Find all Android emulators (AVDs) installed on this machine.
 */
export const findAllAndroidEmulators = (): AndroidEmulator[] => {
  const names = runEmulator(['-list-avds'])
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const serialByName = findAllRunningAndroidEmulators();
  return names.map((name) => {
    const serial = serialByName.get(name) ?? null;
    return { name, running: !!serial, serial };
  });
};

/**
 * Boot an Android emulator and wait until it has finished booting.
 *
 * Returns the serial of the running emulator.
 */
export const bootAndroidEmulator = async (emulator: AndroidEmulator): Promise<string> => {
  if (emulator.serial) {
    return emulator.serial;
  }
  const child = spawn(getAndroidToolPath('emulator', 'emulator'), ['-avd', emulator.name], {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  const deadline = Date.now() + BOOT_TIMEOUT_IN_MS;
  while (Date.now() < deadline) {
    await wait(BOOT_POLL_INTERVAL_IN_MS);
    const serial = findAllRunningAndroidEmulators().get(emulator.name);
    if (serial && isAndroidEmulatorBooted(serial)) {
      return serial;
    }
  }
  throw new UserError(`The emulator "${emulator.name}" did not finish booting in time.`);
};

/**
 * Install an APK on a running Android emulator.
 */
export const installAndroidApp = (serial: string, apkPath: string): void => {
  runAdb(['-s', serial, 'install', '-r', apkPath]);
};

/**
 * Launch an app on a running Android emulator.
 */
export const launchAndroidApp = (serial: string, packageName: string): void => {
  runAdb(['-s', serial, 'shell', 'monkey', '-p', packageName, '-c', 'android.intent.category.LAUNCHER', '1']);
};

/**
 * Map the AVD name of every running emulator to its serial.
 */
const findAllRunningAndroidEmulators = (): Map<string, string> => {
  const serials = runAdb(['devices'])
    .split('\n')
    .slice(1)
    .map((line) => line.split('\t')[0]?.trim())
    .filter((serial) => !!serial && serial.startsWith('emulator-'));
  const serialByName = new Map<string, string>();
  for (const serial of serials) {
    if (!serial) {
      continue;
    }
    try {
      const name = runAdb(['-s', serial, 'emu', 'avd', 'name']).split('\n')[0]?.trim();
      if (name) {
        serialByName.set(name, serial);
      }
    } catch {
      // Ignore emulators that do not respond to the console command.
    }
  }
  return serialByName;
};

const isAndroidEmulatorBooted = (serial: string): boolean => {
  try {
    return runAdb(['-s', serial, 'shell', 'getprop', 'sys.boot_completed']).trim() === '1';
  } catch {
    return false;
  }
};

const runAdb = (args: string[]): string => run(getAndroidToolPath('platform-tools', 'adb'), args, 'adb');

const runEmulator = (args: string[]): string => run(getAndroidToolPath('emulator', 'emulator'), args, 'emulator');

const run = (command: string, args: string[], toolName: string): string => {
  try {
    return execFileSync(command, args, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    if (getCodeFromUnknownError(error) === 'ENOENT') {
      throw new UserError(
        `Could not find "${toolName}". Make sure the Android SDK is installed and the ANDROID_HOME environment variable is set.`,
      );
    }
    const stderr = (error as { stderr?: string }).stderr?.trim();
    throw new UserError(stderr ? `The command "${toolName}" failed: ${stderr}` : `The command "${toolName}" failed.`);
  }
};

/**
 * Resolve an Android SDK tool, falling back to the `PATH` if the SDK cannot be located.
 */
const getAndroidToolPath = (directory: string, binary: string): string => {
  const sdkRoot = getAndroidSdkRoot();
  if (sdkRoot) {
    const toolPath = path.join(sdkRoot, directory, binary);
    if (fs.existsSync(toolPath)) {
      return toolPath;
    }
  }
  return binary;
};

const getAndroidSdkRoot = (): string | undefined => {
  const sdkRoot = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  if (sdkRoot) {
    return sdkRoot;
  }
  const defaultSdkRoot = getDefaultAndroidSdkRoot();
  return fs.existsSync(defaultSdkRoot) ? defaultSdkRoot : undefined;
};

const getDefaultAndroidSdkRoot = (): string => {
  switch (process.platform) {
    case 'darwin': {
      return path.join(os.homedir(), 'Library', 'Android', 'sdk');
    }
    case 'win32': {
      return path.join(os.homedir(), 'AppData', 'Local', 'Android', 'Sdk');
    }
    default: {
      return path.join(os.homedir(), 'Android', 'Sdk');
    }
  }
};
