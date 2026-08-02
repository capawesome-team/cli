import { getCodeFromUnknownError, UserError } from '@/utils/error.js';
import { wait } from '@/utils/wait.js';
import { execFileSync, spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const BOOT_POLL_INTERVAL_IN_MS = 2000;
const BOOT_TIMEOUT_IN_MS = 300000;

export interface AndroidEmulator {
  id: string;
  name: string;
  running: boolean;
  sdkVersion: string | null;
  serial: string | null;
}

/**
 * Find all Android emulators (AVDs) installed on this machine.
 */
export const findAllAndroidEmulators = (): AndroidEmulator[] => {
  const ids = runEmulator(['-list-avds'])
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const serialById = findAllRunningAndroidEmulators();
  return ids.map((id) => {
    const serial = serialById.get(id) ?? null;
    const { displayName, sdkVersion } = getAndroidEmulatorConfig(id);
    return {
      id,
      name: displayName ?? id,
      running: !!serial,
      sdkVersion,
      serial,
    };
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
  const child = spawn(getAndroidToolPath('emulator', 'emulator'), ['-avd', emulator.id], {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  const deadline = Date.now() + BOOT_TIMEOUT_IN_MS;
  while (Date.now() < deadline) {
    await wait(BOOT_POLL_INTERVAL_IN_MS);
    const serial = findAllRunningAndroidEmulators().get(emulator.id);
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
 * Map the AVD ID of every running emulator to its serial.
 */
const findAllRunningAndroidEmulators = (): Map<string, string> => {
  const serials = runAdb(['devices'])
    .split('\n')
    .slice(1)
    .map((line) => line.split('\t')[0]?.trim())
    .filter((serial) => !!serial && serial.startsWith('emulator-'));
  const serialById = new Map<string, string>();
  for (const serial of serials) {
    if (!serial) {
      continue;
    }
    try {
      const id = runAdb(['-s', serial, 'emu', 'avd', 'name']).split('\n')[0]?.trim();
      if (id) {
        serialById.set(id, serial);
      }
    } catch {
      // Ignore emulators that do not respond to the console command.
    }
  }
  return serialById;
};

/**
 * Read the display name and API level of an emulator from its AVD configuration.
 */
const getAndroidEmulatorConfig = (id: string): { displayName: string | null; sdkVersion: string | null } => {
  try {
    const config = fs.readFileSync(path.join(getAndroidAvdHome(), `${id}.avd`, 'config.ini'), 'utf-8');
    return {
      displayName: config.match(/^avd\.ini\.displayname=(.+)$/m)?.[1]?.trim() ?? null,
      sdkVersion: config.match(/android-(\d+)/)?.[1] ?? null,
    };
  } catch {
    return { displayName: null, sdkVersion: null };
  }
};

const getAndroidAvdHome = (): string => {
  const avdHome = process.env.ANDROID_AVD_HOME;
  if (avdHome) {
    return avdHome;
  }
  const sdkHome = process.env.ANDROID_SDK_HOME;
  return sdkHome ? path.join(sdkHome, '.android', 'avd') : path.join(os.homedir(), '.android', 'avd');
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
        `Could not find "${toolName}". Make sure the Android SDK is installed and either the ANDROID_HOME or ANDROID_SDK_ROOT environment variable points to it.`,
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
