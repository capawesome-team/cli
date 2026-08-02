import appBuildsService from '@/services/app-builds.js';
import { AppBuildDto } from '@/types/app-build.js';
import {
  AndroidEmulator,
  bootAndroidEmulator,
  findAllAndroidEmulators,
  installAndroidApp,
  launchAndroidApp,
} from '@/utils/android-emulator.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import {
  bootIosSimulator,
  findAllIosSimulators,
  installIosApp,
  IosSimulator,
  launchIosApp,
} from '@/utils/ios-simulator.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import zip from '@/utils/zip.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { z } from 'zod';

interface Target<T> {
  device: T;
  id: string;
  label: string;
  name: string;
  running: boolean;
  sdkVersion: string | null;
}

interface TargetSelection {
  target?: string;
  targetName?: string;
  targetNameSdkVersion?: string;
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
      list: z.boolean().optional().describe('Print a list of the emulators and simulators available on this machine.'),
      target: z.string().optional().describe('Run on a specific target device by its ID.'),
      targetName: z
        .string()
        .optional()
        .describe('Run on a specific target device by its name (e.g. "Pixel 8 Pro", "iPhone 17 Pro").'),
      targetNameSdkVersion: z
        .string()
        .optional()
        .describe(
          'Run on a target device by name with a specific SDK version when using --target-name (e.g. "18.2" for iOS 18.2 or "35" for Android API 35).',
        ),
    }),
  ),
  action: withAuth(async (options) => {
    let { appId, buildId } = options;
    const { buildNumber, list, target, targetName, targetNameSdkVersion } = options;

    // Listing the local emulators and simulators does not require a build.
    if (list) {
      handleTargetList();
      return;
    }

    if (targetNameSdkVersion && !targetName) {
      consola.error('You must provide --target-name when using --target-name-sdk-version.');
      process.exit(1);
    }

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

    const isAndroid = build.platform === 'android';
    const androidTargets = isAndroid ? findAllAndroidEmulators().map(toAndroidTarget) : [];
    const iosTargets = isAndroid ? [] : findAllIosSimulators().map(toIosTarget);
    const targets = isAndroid ? androidTargets : iosTargets;
    if (targets.length === 0) {
      consola.error(
        isAndroid
          ? 'No Android emulators found. Create one in Android Studio and try again.'
          : 'No iOS simulators found. Install one via Xcode and try again.',
      );
      process.exit(1);
    }

    const artifactType = isAndroid ? 'apk' : 'app';
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

    const targetSelection: TargetSelection = { target, targetName, targetNameSdkVersion };
    try {
      if (isAndroid) {
        const apkPath = path.join(temporaryDirectoryPath, 'app.apk');
        await fs.writeFile(apkPath, Buffer.from(artifactData));
        await handleAndroidRun({ apkPath, packageName, targets: androidTargets, targetSelection });
      } else {
        const appPath = await extractAppBundle(Buffer.from(artifactData), temporaryDirectoryPath);
        await handleIosRun({ appPath, packageName, targets: iosTargets, targetSelection });
      }
    } finally {
      await fs.rm(temporaryDirectoryPath, { force: true, recursive: true });
    }
  }),
});

/**
 * Print every emulator and simulator available on this machine.
 */
const handleTargetList = (): void => {
  const rows: { id: string; name: string; platform: string; running: boolean; sdkVersion: string | null }[] = [];
  try {
    rows.push(
      ...findAllAndroidEmulators().map(({ id, name, running, sdkVersion }) => ({
        id,
        name,
        platform: 'android',
        running,
        sdkVersion,
      })),
    );
  } catch {
    // Ignore machines without an Android SDK.
  }
  if (process.platform === 'darwin') {
    try {
      rows.push(
        ...findAllIosSimulators().map(({ id, name, running, sdkVersion }) => ({
          id,
          name,
          platform: 'ios',
          running,
          sdkVersion,
        })),
      );
    } catch {
      // Ignore machines without Xcode.
    }
  }

  if (rows.length === 0) {
    consola.error(
      'No emulators or simulators found. Create an Android emulator in Android Studio or install an iOS simulator via Xcode.',
    );
    process.exit(1);
  }
  console.table(rows);
};

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

const toAndroidTarget = (emulator: AndroidEmulator): Target<AndroidEmulator> => ({
  device: emulator,
  id: emulator.id,
  label: emulator.sdkVersion ? `${emulator.name} (API ${emulator.sdkVersion})` : emulator.name,
  name: emulator.name,
  running: emulator.running,
  sdkVersion: emulator.sdkVersion,
});

const toIosTarget = (simulator: IosSimulator): Target<IosSimulator> => ({
  device: simulator,
  id: simulator.id,
  label: `${simulator.name} (iOS ${simulator.sdkVersion})`,
  name: simulator.name,
  running: simulator.running,
  sdkVersion: simulator.sdkVersion,
});

/**
 * Select the target device to run the build on, preferring targets that are already running.
 */
const selectTarget = async <T>(targets: Target<T>[], selection: TargetSelection): Promise<T> => {
  const sortedTargets = [...targets].sort(
    (target, otherTarget) => Number(otherTarget.running) - Number(target.running),
  );

  if (selection.target) {
    const matchingTarget = sortedTargets.find((target) => target.id === selection.target);
    if (!matchingTarget) {
      consola.error(`No target device with the ID "${selection.target}" was found.`);
      process.exit(1);
    }
    return matchingTarget.device;
  }

  if (selection.targetName) {
    const matchingTargets = sortedTargets.filter(
      (target) =>
        target.name === selection.targetName &&
        (!selection.targetNameSdkVersion || target.sdkVersion === selection.targetNameSdkVersion),
    );
    const matchingTarget = matchingTargets[0];
    if (!matchingTarget) {
      consola.error(`No target device named "${selection.targetName}" was found.`);
      process.exit(1);
    }
    if (matchingTargets.length > 1) {
      consola.warn(
        `Multiple target devices named "${selection.targetName}" were found. Using "${matchingTarget.label}". Use --target-name-sdk-version or --target to select a specific one.`,
      );
    }
    return matchingTarget.device;
  }

  if (!isInteractive()) {
    consola.error('You must provide a target device when running in non-interactive environment.');
    process.exit(1);
  }

  // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
  const selectedIndex: string = await prompt('Select the target device you want to run the build on:', {
    type: 'select',
    options: sortedTargets.map((target, index) => ({
      label: target.running ? `${target.label} (running)` : target.label,
      value: `${index}`,
    })),
  });

  const selectedTarget = sortedTargets[Number(selectedIndex)];
  if (!selectedTarget) {
    consola.error('You must select a target device to run the build on.');
    process.exit(1);
  }
  return selectedTarget.device;
};

/**
 * Run an Android build on a local emulator.
 */
const handleAndroidRun = async (options: {
  apkPath: string;
  packageName: string;
  targets: Target<AndroidEmulator>[];
  targetSelection: TargetSelection;
}): Promise<void> => {
  const { apkPath, packageName, targets, targetSelection } = options;

  const emulator = await selectTarget(targets, targetSelection);

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
const handleIosRun = async (options: {
  appPath: string;
  packageName: string;
  targets: Target<IosSimulator>[];
  targetSelection: TargetSelection;
}): Promise<void> => {
  const { appPath, packageName, targets, targetSelection } = options;

  const simulator = await selectTarget(targets, targetSelection);

  consola.start(
    simulator.running ? `Using simulator "${simulator.name}"...` : `Starting simulator "${simulator.name}"...`,
  );
  bootIosSimulator(simulator);
  consola.success(`Simulator "${simulator.name}" is running.`);

  consola.start('Installing app...');
  installIosApp(simulator.id, appPath);
  consola.success('App installed.');

  consola.start('Launching app...');
  launchIosApp(simulator.id, packageName);
  consola.success('App launched.');
};
