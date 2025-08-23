import appsService from '@/services/apps.js';
import authorizationService from '@/services/authorization-service.js';
import organizationsService from '@/services/organizations.js';
import { prompt } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import { execSync } from 'child_process';
import consola from 'consola';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { isCI } from 'std-env';
import { z } from 'zod';

type PackageManager = 'npm' | 'yarn' | 'pnpm';
type Framework = 'angular' | 'react' | 'vue' | 'others';
type Platform = 'android' | 'ios';

export default defineCommand({
  description: 'Set up the Live Update plugin for a Capacitor app.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the Capawesome Cloud app.'),
    }),
  ),
  action: async (options) => {
    let { appId } = options;

    // Step 1: Check CI environment
    if (isCI) {
      consola.error('This command is not available in CI environments.');
      process.exit(1);
    }

    // Step 2: Check if running in a Capacitor project
    const hasCapacitorConfig = existsSync('capacitor.config.ts') || existsSync('capacitor.config.json');
    if (!hasCapacitorConfig) {
      consola.error('This command must be run in a Capacitor project directory.');
      consola.info('Please navigate to your Capacitor project and try again.');
      process.exit(0);
    }

    // Step 3: Handle app selection if no appId provided
    if (!appId) {
      // Check authentication
      if (!authorizationService.hasAuthorizationToken()) {
        consola.error('You must be logged in to run this command.');
        consola.info('Please run `capawesome login` to authenticate.');
        process.exit(0);
      }

      // Select organization
      const organizations = await organizationsService.findAll();
      if (organizations.length === 0) {
        consola.error('No organizations found. Please create an organization first.');
        consola.info('Run `capawesome organizations:create` to create a new organization.');
        process.exit(0);
      }

      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      const organizationId = await prompt('Which organization contains your app?', {
        type: 'select',
        options: organizations.map((org) => ({ label: org.name, value: org.id })),
      });

      if (!organizationId) {
        consola.error('Organization selection is required.');
        process.exit(1);
      }

      // Select app
      const apps = await appsService.findAll({ organizationId });
      if (apps.length === 0) {
        consola.error('No apps found in the selected organization.');
        consola.info('Run `capawesome apps:create` to create a new app.');
        process.exit(0);
      }

      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      appId = await prompt('Which app do you want to set up?', {
        type: 'select',
        options: apps.map((app) => ({ label: app.name, value: app.id })),
      });

      if (!appId) {
        consola.error('App selection is required.');
        process.exit(1);
      }
    }

    // Step 4: Select package manager
    // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
    const packageManager: PackageManager = await prompt('Which package manager do you want to use?', {
      type: 'select',
      options: [
        { label: 'npm', value: 'npm' },
        { label: 'yarn', value: 'yarn' },
        { label: 'pnpm', value: 'pnpm' },
      ],
    });

    // Step 5: Select framework
    // @ts-ignore wait till https://github.com/unjs/consola/pull-280 is merged
    const framework: Framework = await prompt('Which framework are you using?', {
      type: 'select',
      options: [
        { label: 'Angular', value: 'angular' },
        { label: 'React', value: 'react' },
        { label: 'Vue', value: 'vue' },
        { label: 'Others', value: 'others' },
      ],
    });

    // Step 6: Install the plugin
    consola.start('Installing @capawesome/capacitor-live-update...');
    const installCommand = `${packageManager} ${packageManager === 'npm' ? 'install' : 'add'} @capawesome/capacitor-live-update@latest`;
    try {
      execSync(installCommand, { stdio: 'inherit' });
      consola.success('Plugin installed successfully.');
    } catch (error) {
      consola.error('Failed to install the plugin.');
      process.exit(1);
    }

    // Step 7: Update Capacitor configuration
    await updateCapacitorConfig(appId);

    // Step 8: Sync Capacitor project
    consola.start('Updating Capacitor project...');
    try {
      const syncCommand = getCapacitorCommand('cap update', packageManager);
      execSync(syncCommand, { stdio: 'inherit' });
      consola.success('Capacitor project updated successfully.');
    } catch (error) {
      consola.error('Failed to update Capacitor project.');
      process.exit(1);
    }

    // Step 9: Implement framework-specific code
    await implementLiveUpdateCode(framework);

    // Step 10: Display helpful resources
    displayHelpfulResources();

    // Step 11: Ask about testing
    const wantToTest = await prompt('Do you want to test the live update functionality?', {
      type: 'confirm',
      initial: true,
    });

    if (wantToTest) {
      await handleTesting(appId, framework, packageManager);
    }

    consola.success('Live update setup completed successfully!');
  },
});

async function updateCapacitorConfig(appId: string): Promise<void> {
  consola.start('Updating Capacitor configuration...');

  const tsConfigPath = 'capacitor.config.ts';
  const jsonConfigPath = 'capacitor.config.json';

  if (existsSync(tsConfigPath)) {
    // Handle TypeScript config
    let configContent = readFileSync(tsConfigPath, 'utf8');

    if (configContent.includes('LiveUpdate')) {
      consola.info('LiveUpdate configuration already exists in capacitor.config.ts');
      return;
    }

    // Add LiveUpdate config to plugins section
    if (configContent.includes('plugins:')) {
      // Insert into existing plugins object
      // Use a simple approach: find the closing brace of plugins and insert before it
      const pluginsMatch = configContent.match(/plugins:\s*\{([\s\S]*?)\n\s*\}/);
      if (pluginsMatch && pluginsMatch[1] !== undefined) {
        const pluginsContent = pluginsMatch[1];
        const needsComma = pluginsContent.trim().length > 0 && !pluginsContent.trim().endsWith(',');
        const comma = needsComma ? ',' : '';

        configContent = configContent.replace(
          /plugins:\s*\{([\s\S]*?)\n(\s*)\}/,
          `plugins: {$1${comma}
$2  LiveUpdate: {
$2    appId: '${appId}',
$2  },
$2}`,
        );
      }
    } else {
      // Add plugins section after the last property
      // Find the closing brace of the config object
      const configMatch = configContent.match(/const config: CapacitorConfig = \{([\s\S]*?)\n(\s*)\};/);
      if (configMatch && configMatch[1] !== undefined) {
        const configInner = configMatch[1];
        const needsComma = configInner.trim().length > 0 && !configInner.trim().endsWith(',');
        const comma = needsComma ? ',' : '';

        configContent = configContent.replace(
          /const config: CapacitorConfig = \{([\s\S]*?)\n(\s*)\};/,
          `const config: CapacitorConfig = {$1${comma}
$2plugins: {
$2  LiveUpdate: {
$2    appId: '${appId}',
$2  },
$2},
$2};`,
        );
      }
    }

    writeFileSync(tsConfigPath, configContent);
  } else if (existsSync(jsonConfigPath)) {
    // Handle JSON config
    const configContent = JSON.parse(readFileSync(jsonConfigPath, 'utf8'));

    if (configContent.plugins?.LiveUpdate) {
      consola.info('LiveUpdate configuration already exists in capacitor.config.json');
      return;
    }

    if (!configContent.plugins) {
      configContent.plugins = {};
    }

    configContent.plugins.LiveUpdate = {
      appId: appId,
    };

    writeFileSync(jsonConfigPath, JSON.stringify(configContent, null, 2));
  }

  consola.success('Capacitor configuration updated successfully.');
}

async function implementLiveUpdateCode(framework: Framework): Promise<void> {
  consola.start('Implementing Live Update code...');

  const liveUpdateCode = `import { LiveUpdate } from "@capawesome/capacitor-live-update";

const sync = async () => {
  const result = await LiveUpdate.sync();
  if (result.nextBundleId) {
    await LiveUpdate.reload();
  }
};`;

  switch (framework) {
    case 'angular':
      await implementAngularCode();
      break;
    case 'react':
      await implementReactCode();
      break;
    case 'vue':
      await implementVueCode();
      break;
    case 'others':
      consola.box(`Please add the following code to your app's startup:

${liveUpdateCode}

Call the sync() function at app startup.`);

      const confirmed = await prompt('Have you integrated the Live Update code?', {
        type: 'confirm',
      });

      if (!confirmed) {
        consola.error('Please integrate the Live Update code before proceeding.');
        process.exit(1);
      }
      break;
  }

  consola.success('Live Update code implemented successfully.');
}

async function implementAngularCode(): Promise<void> {
  const mainTsPath = 'src/main.ts';

  if (!existsSync(mainTsPath)) {
    consola.error('Could not find src/main.ts. Please integrate the code manually.');
    return;
  }

  let mainContent = readFileSync(mainTsPath, 'utf8');

  if (mainContent.includes('LiveUpdate')) {
    consola.info('Live Update code already exists in main.ts');
    return;
  }

  // Add import and sync call
  const importLine = `import { LiveUpdate } from "@capawesome/capacitor-live-update";`;
  const syncFunction = `
const sync = async () => {
  const result = await LiveUpdate.sync();
  if (result.nextBundleId) {
    await LiveUpdate.reload();
  }
};`;

  // Add import at the top
  if (!mainContent.includes(importLine)) {
    mainContent = importLine + '\n' + mainContent;
  }

  // Add sync function
  if (!mainContent.includes('const sync = async')) {
    mainContent = mainContent.replace(/import.*\n/g, (match, offset) => {
      return offset === mainContent.lastIndexOf('import') ? match + syncFunction + '\n' : match;
    });
  }

  // Add sync call before bootstrapApplication
  if (!mainContent.includes('sync();')) {
    mainContent = mainContent.replace(/bootstrapApplication/, 'sync();\n\nbootstrapApplication');
  }

  writeFileSync(mainTsPath, mainContent);
  consola.success('Live Update code added to src/main.ts');
}

async function implementReactCode(): Promise<void> {
  const possiblePaths = ['src/main.tsx', 'src/main.ts', 'src/index.tsx', 'src/index.ts'];
  let mainPath = null;

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      mainPath = path;
      break;
    }
  }

  if (!mainPath) {
    consola.error('Could not find main entry file. Please integrate the code manually.');
    return;
  }

  let mainContent = readFileSync(mainPath, 'utf8');

  if (mainContent.includes('LiveUpdate')) {
    consola.info('Live Update code already exists');
    return;
  }

  // Add import and sync call
  const importLine = `import { LiveUpdate } from "@capawesome/capacitor-live-update";`;
  const syncFunction = `
const sync = async () => {
  const result = await LiveUpdate.sync();
  if (result.nextBundleId) {
    await LiveUpdate.reload();
  }
};`;

  // Add import at the top
  if (!mainContent.includes(importLine)) {
    mainContent = importLine + '\n' + mainContent;
  }

  // Add sync function and call
  if (!mainContent.includes('const sync = async')) {
    mainContent = mainContent.replace(/import.*\n/g, (match, offset) => {
      return offset === mainContent.lastIndexOf('import') ? match + syncFunction + '\n\nsync();\n' : match;
    });
  }

  writeFileSync(mainPath, mainContent);
  consola.success(`Live Update code added to ${mainPath}`);
}

async function implementVueCode(): Promise<void> {
  const possiblePaths = ['src/main.ts', 'src/main.js'];
  let mainPath = null;

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      mainPath = path;
      break;
    }
  }

  if (!mainPath) {
    consola.error('Could not find src/main.ts or src/main.js. Please integrate the code manually.');
    return;
  }

  let mainContent = readFileSync(mainPath, 'utf8');

  if (mainContent.includes('LiveUpdate')) {
    consola.info('Live Update code already exists');
    return;
  }

  // Add import and sync call
  const importLine = `import { LiveUpdate } from "@capawesome/capacitor-live-update";`;
  const syncFunction = `
const sync = async () => {
  const result = await LiveUpdate.sync();
  if (result.nextBundleId) {
    await LiveUpdate.reload();
  }
};`;

  // Add import at the top
  if (!mainContent.includes(importLine)) {
    mainContent = importLine + '\n' + mainContent;
  }

  // Add sync function and call
  if (!mainContent.includes('const sync = async')) {
    mainContent = mainContent.replace(/import.*\n/g, (match, offset) => {
      return offset === mainContent.lastIndexOf('import') ? match + syncFunction + '\n\nsync();\n' : match;
    });
  }

  writeFileSync(mainPath, mainContent);
  consola.success(`Live Update code added to ${mainPath}`);
}

function displayHelpfulResources(): void {
  consola.box(`🎉 Setup complete! Here are some helpful resources:

📚 Plugin Documentation: https://capawesome.io/plugins/live-update/
🔧 Capacitor Configuration: https://capacitorjs.com/docs/config
🚀 Getting Started Guide: https://capawesome.io/plugins/live-update/getting-started/
💡 Best Practices: https://capawesome.io/plugins/live-update/best-practices/`);
}

async function handleTesting(_appId: string, framework: Framework, packageManager: PackageManager): Promise<void> {
  consola.start('Checking for existing bundles...');

  // TODO: Check for existing bundles via API
  const copyDemoBundle = await prompt(
    'No bundles found for this app. Would you like to copy the official demo bundle for testing?',
    {
      type: 'confirm',
      initial: true,
    },
  );

  if (copyDemoBundle) {
    // TODO: Implement demo bundle copying via API call
  }

  let needsBuild = framework === 'others';
  if (framework === 'others') {
    needsBuild = await prompt('Do you need to perform a local web build?', {
      type: 'confirm',
      initial: true,
    });
  }

  if (framework !== 'others' || needsBuild) {
    const defaultBuildCommand = getBuildCommandForFramework(framework, packageManager);
    const buildCommand = await prompt('Enter the command to perform a local web build:', {
      type: 'text',
      initial: defaultBuildCommand,
    });

    if (buildCommand) {
      consola.start('Building project...');
      try {
        execSync(buildCommand, { stdio: 'inherit' });
        consola.success('Build completed successfully.');
      } catch (error) {
        consola.error('Build failed.');
        return;
      }

      // Sync again after build
      consola.start('Syncing Capacitor project...');
      try {
        const syncCommand = getCapacitorCommand('cap sync', packageManager);
        execSync(syncCommand, { stdio: 'inherit' });
        consola.success('Capacitor project synced successfully.');
      } catch (error) {
        consola.error('Failed to sync Capacitor project.');
        return;
      }
    }
  }

  // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
  const platform: Platform = await prompt('Which platform do you want to test on?', {
    type: 'select',
    options: [
      { label: 'Android', value: 'android' },
      { label: 'iOS', value: 'ios' },
    ],
  });

  consola.start(`Opening ${platform === 'android' ? 'Android Studio' : 'Xcode'}...`);
  try {
    const openCommand = getCapacitorCommand(`cap open ${platform}`, packageManager);
    execSync(openCommand, { stdio: 'inherit' });
    consola.success(`${platform === 'android' ? 'Android Studio' : 'Xcode'} opened successfully.`);
    consola.info('You can now test the live update functionality by running the app on a device.');
  } catch (error) {
    consola.error(`Failed to open ${platform === 'android' ? 'Android Studio' : 'Xcode'}.`);
  }
}

function getCapacitorCommand(command: string, packageManager: PackageManager): string {
  // Use package manager-specific commands to run Capacitor CLI
  // yarn and pnpm can run packages directly, npm uses npx
  switch (packageManager) {
    case 'yarn':
      return `yarn ${command}`;
    case 'pnpm':
      return `pnpm ${command}`;
    case 'npm':
    default:
      return `npx ${command}`;
  }
}

function getBuildCommandForFramework(framework: Framework, packageManager: PackageManager): string {
  const pm = packageManager === 'yarn' ? 'yarn' : packageManager;

  switch (framework) {
    case 'angular':
      return `${pm} ${pm === 'npm' ? 'run ' : ''}build`;
    case 'react':
      return `${pm} ${pm === 'npm' ? 'run ' : ''}build`;
    case 'vue':
      return `${pm} ${pm === 'npm' ? 'run ' : ''}build`;
    default:
      return `${pm} ${pm === 'npm' ? 'run ' : ''}build`;
  }
}
