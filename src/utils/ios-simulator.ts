import { getCodeFromUnknownError, UserError } from '@/utils/error.js';
import { execFileSync } from 'child_process';

interface SimctlDevice {
  name: string;
  state: string;
  udid: string;
}

export interface IosSimulator {
  id: string;
  name: string;
  running: boolean;
  sdkVersion: string;
}

/**
 * Find all available iOS simulators installed on this machine.
 */
export const findAllIosSimulators = (): IosSimulator[] => {
  const output = runSimctl(['list', 'devices', 'available', '--json']);
  const devicesByRuntime = (JSON.parse(output).devices ?? {}) as Record<string, SimctlDevice[]>;
  return Object.entries(devicesByRuntime)
    .filter(([runtime]) => runtime.includes('iOS'))
    .flatMap(([runtime, devices]) =>
      devices.map((device) => ({
        id: device.udid,
        name: device.name,
        running: device.state === 'Booted',
        sdkVersion: getRuntimeVersion(runtime),
      })),
    );
};

/**
 * Boot an iOS simulator, wait until it has finished booting and bring it to the front.
 */
export const bootIosSimulator = (simulator: IosSimulator): void => {
  runSimctl(['bootstatus', simulator.id, '-b']);
  run('open', ['-a', 'Simulator'], 'open');
};

/**
 * Install an app bundle on a booted iOS simulator.
 */
export const installIosApp = (id: string, appPath: string): void => {
  runSimctl(['install', id, appPath]);
};

/**
 * Launch an app on a booted iOS simulator.
 */
export const launchIosApp = (id: string, packageName: string): void => {
  runSimctl(['launch', id, packageName]);
};

/**
 * Extract the version from a simulator runtime identifier (e.g. `18.2`).
 */
const getRuntimeVersion = (runtime: string): string => {
  const identifier = runtime.split('.').pop() ?? runtime;
  const [, ...version] = identifier.split('-');
  return version.join('.');
};

const runSimctl = (args: string[]): string => run('xcrun', ['simctl', ...args], 'simctl');

const run = (command: string, args: string[], toolName: string): string => {
  try {
    return execFileSync(command, args, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    if (getCodeFromUnknownError(error) === 'ENOENT') {
      throw new UserError(`Could not find "${toolName}". Make sure Xcode is installed.`);
    }
    const stderr = (error as { stderr?: string }).stderr?.trim();
    throw new UserError(stderr ? `The command "${toolName}" failed: ${stderr}` : `The command "${toolName}" failed.`);
  }
};
