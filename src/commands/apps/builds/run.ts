import appBuildsService from '@/services/app-builds.js';
import { AppBuildDto } from '@/types/app-build.js';
import {
  bootAndroidEmulator,
  findAllAndroidEmulators,
  installAndroidApp,
  launchAndroidApp,
} from '@/utils/android-emulator.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { bootIosSimulator, findAllIosSimulators, installIosApp, launchIosApp } from '@/utils/ios-simulator.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import zip from '@/utils/zip.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { z } from 'zod';

interface DeviceOption<T> {
  device: T;
  label: string;
  name: string;
  running: boolean;
}

export default defineCommand({
  description: 'Run an app build on a local emulator or simulator.',
  options: defineOptions(
    z.object({
      appId: z
        .uuid({
          message: 'App ID must be a UUID.',
        })
        .optional()
        .describe('App ID the build belongs to.'),
      buildId: z
        .uuid({
          message: 'Build ID must be a UUID.',
        })
        .optional()
        .describe('Build ID to run.'),
      buildNumber: z.string().optional().describe('Build number to run (e.g., "1", "42").'),
      device: z.string().optional().describe('Name of the emulator or simulator to run the build on.'),
    }),
  ),
  action: withAuth(async (options) => {
    let { appId, buildId } = options;
    const { buildNumber, device } = options;

    // Prompt for app ID if not provided
    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizationId = await promptOrganizationSelection();
      appId = await promptAppSelection(organizationId);
    }

    // Convert build number to build ID if provided
    if (!buildId && buildNumber) {
      const builds = await appBuildsService.findAll({ appId, numberAsString: buildNumber });
      if (builds.length === 0) {
        consola.error(`Build #${buildNumber} not found.`);
        process.exit(1);
      }
      buildId = builds[0]?.id;
    }

    // Prompt for build ID if not provided
    if (!buildId) {
      if (!isInteractive()) {
        consola.error('You must provide a build ID when running in non-interactive environment.');
        process.exit(1);
      }
      const builds = await appBuildsService.findAll({ appId });
      if (builds.length === 0) {
        consola.error('No builds found for this app.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      buildId = await prompt('Select the build you want to run:', {
        type: 'select',
        options: builds.map((build) => ({
          label: `Build #${build.numberAsString || build.id} (${build.platform} - ${build.type})`,
          value: build.id,
        })),
      });
      if (!buildId) {
        consola.error('You must select a build to run.');
        process.exit(1);
      }
    }

    const build = await appBuildsService.findOne({ appId, appBuildId: buildId, relations: 'appBuildArtifacts,job' });
    const packageName = validateAppBuild(build);

    const artifactType = build.platform === 'android' ? 'apk' : 'app';
    const artifact = build.appBuildArtifacts?.find(
      (artifact) => artifact.type === artifactType && artifact.status === 'ready',
    );
    if (!artifact) {
      consola.error(`No ${artifactType.toUpperCase()} artifact is available for this build.`);
      process.exit(1);
    }

    consola.start('Downloading build...');
    const artifactData = await appBuildsService.downloadArtifact({
      appId,
      appBuildId: buildId,
      artifactId: artifact.id,
    });
    const temporaryDirectoryPath = await fs.mkdtemp(path.join(os.tmpdir(), 'capawesome-'));
    consola.success('Build downloaded.');

    if (build.platform === 'android') {
      const apkPath = path.join(temporaryDirectoryPath, 'app.apk');
      await fs.writeFile(apkPath, Buffer.from(artifactData));
      await handleAndroidRun({ apkPath, deviceName: device, packageName });
    } else {
      const appPath = await extractAppBundle(Buffer.from(artifactData), temporaryDirectoryPath);
      await handleIosRun({ appPath, deviceName: device, packageName });
    }
  }),
});

/**
 * Ensure the build can be run locally and return its package name.
 */
const validateAppBuild = (build: AppBuildDto): string => {
  if (build.job?.status !== 'succeeded') {
    consola.error('The build has not succeeded yet. Cannot run incomplete builds.');
    process.exit(1);
  }
  if (build.platform === 'web') {
    consola.error('Web builds cannot be run on an emulator or simulator.');
    process.exit(1);
  }
  if (build.platform === 'ios') {
    if (process.platform !== 'darwin') {
      consola.error('iOS builds can only be run on macOS.');
      process.exit(1);
    }
    if (build.type !== 'simulator') {
      consola.error(
        `Only iOS builds of the type "simulator" can be run on a simulator. This build has the type "${build.type}".`,
      );
      process.exit(1);
    }
  }
  if (!build.packageName) {
    consola.error('The package name of this build is unknown. Please create a new build and try again.');
    process.exit(1);
  }
  return build.packageName;
};

/**
 * Extract the app bundle from the downloaded artifact and return its path.
 */
const extractAppBundle = async (artifactData: Buffer, targetFolder: string): Promise<string> => {
  await zip.unzipToFolder(artifactData, targetFolder);
  const entries = await fs.readdir(targetFolder);
  const appBundleName = entries.find((entry) => entry.endsWith('.app'));
  if (!appBundleName) {
    consola.error('The downloaded artifact does not contain an app bundle.');
    process.exit(1);
  }
  return path.join(targetFolder, appBundleName);
};

/**
 * Select the device to run the build on, preferring devices that are already running.
 */
const selectDevice = async <T>(deviceOptions: DeviceOption<T>[], deviceName?: string): Promise<T> => {
  const sortedDeviceOptions = [...deviceOptions].sort(
    (deviceOption, otherDeviceOption) => Number(otherDeviceOption.running) - Number(deviceOption.running),
  );

  if (deviceName) {
    const matchingDeviceOption = sortedDeviceOptions.find((deviceOption) => deviceOption.name === deviceName);
    if (!matchingDeviceOption) {
      consola.error(`The device "${deviceName}" was not found.`);
      process.exit(1);
    }
    return matchingDeviceOption.device;
  }

  if (!isInteractive()) {
    consola.error('You must provide a device when running in non-interactive environment.');
    process.exit(1);
  }

  // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
  const selectedIndex: string = await prompt('Select the device you want to run the build on:', {
    type: 'select',
    options: sortedDeviceOptions.map((deviceOption, index) => ({
      label: deviceOption.running ? `${deviceOption.label} (running)` : deviceOption.label,
      value: `${index}`,
    })),
  });

  const selectedDeviceOption = sortedDeviceOptions[Number(selectedIndex)];
  if (!selectedDeviceOption) {
    consola.error('You must select a device to run the build on.');
    process.exit(1);
  }
  return selectedDeviceOption.device;
};

/**
 * Run an Android build on a local emulator.
 */
const handleAndroidRun = async (options: {
  apkPath: string;
  deviceName?: string;
  packageName: string;
}): Promise<void> => {
  const { apkPath, deviceName, packageName } = options;

  const emulators = findAllAndroidEmulators();
  if (emulators.length === 0) {
    consola.error('No Android emulators found. Create one in Android Studio and try again.');
    process.exit(1);
  }
  const emulator = await selectDevice(
    emulators.map((emulator) => ({
      device: emulator,
      label: emulator.name,
      name: emulator.name,
      running: emulator.running,
    })),
    deviceName,
  );

  consola.start(emulator.running ? `Using emulator "${emulator.name}"...` : `Starting emulator "${emulator.name}"...`);
  const serial = await bootAndroidEmulator(emulator);
  consola.success(`Emulator "${emulator.name}" is running.`);

  consola.start('Installing app...');
  installAndroidApp(serial, apkPath);
  consola.success('App installed.');

  consola.start('Launching app...');
  launchAndroidApp(serial, packageName);
  consola.success('App launched.');
};

/**
 * Run an iOS build on a local simulator.
 */
const handleIosRun = async (options: { appPath: string; deviceName?: string; packageName: string }): Promise<void> => {
  const { appPath, deviceName, packageName } = options;

  const simulators = findAllIosSimulators();
  if (simulators.length === 0) {
    consola.error('No iOS simulators found. Install one via Xcode and try again.');
    process.exit(1);
  }
  const simulator = await selectDevice(
    simulators.map((simulator) => ({
      device: simulator,
      label: `${simulator.name} (${simulator.runtime})`,
      name: simulator.name,
      running: simulator.running,
    })),
    deviceName,
  );

  consola.start(
    simulator.running ? `Using simulator "${simulator.name}"...` : `Starting simulator "${simulator.name}"...`,
  );
  bootIosSimulator(simulator);
  consola.success(`Simulator "${simulator.name}" is running.`);

  consola.start('Installing app...');
  installIosApp(simulator.udid, appPath);
  consola.success('App installed.');

  consola.start('Launching app...');
  launchIosApp(simulator.udid, packageName);
  consola.success('App launched.');
};
