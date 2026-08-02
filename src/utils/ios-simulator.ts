import { getCodeFromUnknownError, UserError } from '@/utils/error.js';
import { execFileSync } from 'child_process';

interface SimctlDevice {
  name: string;
  state: string;
  udid: string;
}

export interface IosSimulator {
  name: string;
  runtime: string;
  running: boolean;
  udid: string;
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
        name: device.name,
        runtime: getRuntimeName(runtime),
        running: device.state === 'Booted',
        udid: device.udid,
      })),
    );
};

/**
 * Boot an iOS simulator, wait until it has finished booting and bring it to the front.
 */
export const bootIosSimulator = (simulator: IosSimulator): void => {
  runSimctl(['bootstatus', simulator.udid, '-b']);
  run('open', ['-a', 'Simulator'], 'open');
};

/**
 * Install an app bundle on a booted iOS simulator.
 */
export const installIosApp = (udid: string, appPath: string): void => {
  runSimctl(['install', udid, appPath]);
};

/**
 * Launch an app on a booted iOS simulator.
 */
export const launchIosApp = (udid: string, packageName: string): void => {
  runSimctl(['launch', udid, packageName]);
};

/**
 * Convert a simulator runtime identifier into a readable name (e.g. `iOS 18.2`).
 */
const getRuntimeName = (runtime: string): string => {
  const identifier = runtime.split('.').pop() ?? runtime;
  const [platform, ...version] = identifier.split('-');
  return version.length > 0 ? `${platform} ${version.join('.')}` : identifier;
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
