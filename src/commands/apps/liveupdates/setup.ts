import appsService from '@/services/apps.js';
import authorizationService from '@/services/authorization-service.js';
import organizationsService from '@/services/organizations.js';
import { updateCapacitorConfig } from '@/utils/capacitor-config-writer.js';
import { findCapacitorConfigPath, readCapacitorConfig } from '@/utils/capacitor-config.js';
import { copyToClipboard } from '@/utils/clipboard.js';
import { fileExistsAtPath } from '@/utils/file.js';
import { checkOpensslInstalled, generateKeyPair, readPublicKey } from '@/utils/openssl.js';
import { findPackageJsonPath, getCapacitorMajorVersion, isPackageInstalled } from '@/utils/package-json.js';
import { installPackage, PackageManager } from '@/utils/package-manager.js';
import { prompt } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { hasTTY } from 'std-env';
import { z } from 'zod';

export default defineCommand({
  description: 'Set up Live Updates in your Capacitor app.',
  options: defineOptions(
    z.object({
      appId: z.string().uuid().optional().describe('Capawesome Cloud app ID.'),
    }),
  ),
  action: async (options, args) => {
    // Check if running in interactive mode
    if (!hasTTY) {
      consola.error('This command requires an interactive terminal. Please run it in an interactive environment.');
      process.exit(1);
    }

    let { appId } = options;

    // Step 1: Check if Capacitor config exists
    const capacitorConfigPath = await findCapacitorConfigPath();
    if (!capacitorConfigPath) {
      consola.error('No Capacitor configuration found. Make sure you are in a Capacitor project.');
      process.exit(1);
    }

    // Step 2: Read current config
    let config = await readCapacitorConfig(capacitorConfigPath);
    if (!config) {
      config = {};
    }

    // Step 3: Select/Configure Capawesome Cloud App ID
    // Try to get from config first
    if (!appId && config?.plugins?.LiveUpdate?.appId) {
      appId = config.plugins.LiveUpdate.appId;
      consola.info(`Found existing Capawesome Cloud app ID in Capacitor configuration: ${appId}`);
    }

    // Prompt if still not found
    if (!appId) {
      // Check authorization
      if (!authorizationService.hasAuthorizationToken()) {
        consola.error('You must be logged in. Please run the `login` command first.');
        process.exit(1);
      }

      // Prompt for organization
      const organizations = await organizationsService.findAll();
      if (organizations.length === 0) {
        consola.error('You must create an organization before setting up Live Updates.');
        process.exit(1);
      }

      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      const organizationId = await prompt('Select the organization of your app:', {
        type: 'select',
        options: organizations.map((org) => ({
          label: org.name,
          value: org.id,
        })),
      });

      if (!organizationId) {
        consola.error('You must select an organization.');
        process.exit(1);
      }

      // Prompt for app
      const apps = await appsService.findAll({ organizationId });
      if (apps.length === 0) {
        consola.error(
          'You must create an app before setting up Live Updates. Please run the `apps:create` command first.',
        );
        process.exit(1);
      }

      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      appId = await prompt('Select your app:', {
        type: 'select',
        options: apps.map((app) => ({
          label: app.name,
          value: app.id,
        })),
      });

      if (!appId) {
        consola.error('You must select an app.');
        process.exit(1);
      }
    }

    if (!config?.plugins?.LiveUpdate?.appId) {
      // Update config with app ID
      await updateCapacitorConfig(capacitorConfigPath, {
        plugins: {
          LiveUpdate: {
            appId,
          },
        },
      });
      consola.success(`Updated Capacitor configuration with Capawesome Cloud app ID: ${appId}`);
    }

    // Step 4: Install SDK (Optional)
    const packageJsonPath = await findPackageJsonPath();
    let sdkInstalled = false;

    if (packageJsonPath) {
      sdkInstalled = await isPackageInstalled(packageJsonPath, '@capawesome/capacitor-live-update');
      if (sdkInstalled) {
        consola.info('Live Update SDK is already installed.');
      }
    }

    if (!sdkInstalled) {
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      const shouldInstall = await prompt('Do you want to install the Live Update SDK?', {
        type: 'confirm',
        initial: true,
      });

      if (shouldInstall) {
        // Get Capacitor version to install matching plugin version
        let packageName = '@capawesome/capacitor-live-update';
        if (packageJsonPath) {
          const capacitorMajorVersion = await getCapacitorMajorVersion(packageJsonPath);
          if (capacitorMajorVersion) {
            packageName = `@capawesome/capacitor-live-update@^${capacitorMajorVersion}.0.0`;
            consola.info(
              `Installing plugin version ${capacitorMajorVersion} to match Capacitor ${capacitorMajorVersion}`,
            );
          }
        }

        // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
        const packageManager: PackageManager = await prompt('Select your package manager:', {
          type: 'select',
          options: [
            { label: 'npm', value: 'npm' },
            { label: 'yarn', value: 'yarn' },
            { label: 'pnpm', value: 'pnpm' },
          ],
        });

        await installPackage(packageName, packageManager);
        consola.success('Live Update SDK installed successfully.');
      }
    }

    // Step 5: Set Up Code Signing (Optional)
    // Reload config to get latest updates
    config = await readCapacitorConfig(capacitorConfigPath);
    const hasPublicKey = !!config?.plugins?.LiveUpdate?.publicKey;

    if (!hasPublicKey) {
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      const shouldSetupSigning = await prompt('Do you want to set up code signing? (Can be configured later)', {
        type: 'confirm',
        initial: false,
      });

      if (shouldSetupSigning) {
        // Check OpenSSL
        const hasOpenssl = await checkOpensslInstalled();
        if (!hasOpenssl) {
          consola.error('OpenSSL is not installed. Please install OpenSSL to generate key pairs.');
          consola.info('Visit https://www.openssl.org for installation instructions.');
          process.exit(1);
        }

        // Define key paths
        const privateKeyPath = 'keypair.pem';
        const publicKeyPath = 'publickey.crt';

        // Check if files exist
        const privateKeyExists = await fileExistsAtPath(privateKeyPath);
        const publicKeyExists = await fileExistsAtPath(publicKeyPath);

        let shouldGenerate = true;
        if (privateKeyExists || publicKeyExists) {
          // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
          const overwrite = await prompt('Key files already exist. Overwrite them?', {
            type: 'confirm',
            initial: false,
          });
          shouldGenerate = overwrite;
        }

        if (shouldGenerate) {
          // Generate keys
          consola.start('Generating RSA key pair...');
          await generateKeyPair(privateKeyPath, publicKeyPath);
          consola.success('Key pair generated successfully.');

          // Read public key
          const publicKey = await readPublicKey(publicKeyPath);

          // Update config
          await updateCapacitorConfig(capacitorConfigPath, {
            plugins: {
              LiveUpdate: {
                publicKey,
              },
            },
          });
          consola.success('Updated Capacitor configuration with public key.');

          // Show important instructions
          console.log(); // Blank line
          consola.box(
            `IMPORTANT: Keep your private key safe!\n\n` +
              `Private key location: ${privateKeyPath}\n` +
              `Public key location: ${publicKeyPath}\n\n` +
              `When creating bundles, use:\n` +
              `npx @capawesome/cli apps:bundles:create --private-key ${privateKeyPath}`,
          );
        }
      }
    }

    // Step 6: Set Up Auto Rollback (Optional)
    // Reload config again to get latest updates
    config = await readCapacitorConfig(capacitorConfigPath);
    const hasReadyTimeout = config?.plugins?.LiveUpdate?.readyTimeout !== undefined;

    if (hasReadyTimeout) {
      consola.info(
        `Automatic rollback is already configured with timeout: ${config?.plugins?.LiveUpdate?.readyTimeout}ms`,
      );
    }

    if (!hasReadyTimeout) {
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      const shouldSetupRollback = await prompt('Do you want to set up automatic rollbacks? (Can be configured later)', {
        type: 'confirm',
        initial: false,
      });

      if (shouldSetupRollback) {
        const readyTimeout = 10000;

        // Update config
        await updateCapacitorConfig(capacitorConfigPath, {
          plugins: {
            LiveUpdate: {
              readyTimeout,
            },
          },
        });
        consola.success(`Updated Capacitor configuration with ready timeout: ${readyTimeout}ms`);

        // Show code snippet
        console.log(); // Blank line
        consola.info('Add this code to your app as soon as possible during app startup:');
        console.log(); // Blank line
        const readyCode =
          `import { LiveUpdate } from '@capawesome/capacitor-live-update';\n\n` +
          `const ready = async () => {\n` +
          `  // Notify that the app is ready\n` +
          `  await LiveUpdate.ready();\n` +
          `};`;
        consola.box(readyCode);

        // Ask if user wants to copy to clipboard
        // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
        const shouldCopyReady = await prompt('Do you want to copy this code to your clipboard?', {
          type: 'confirm',
          initial: true,
        });

        if (shouldCopyReady) {
          try {
            await copyToClipboard(readyCode);
            consola.success('Code copied to clipboard!');
          } catch (error) {
            consola.warn('Failed to copy to clipboard. Please copy the code manually.');
          }
        }

        // Wait for user to apply the code
        // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
        await prompt('Press Enter to continue once you have added this code to your app...', {
          type: 'confirm',
          initial: true,
        });
      }
    }

    // Step 7: Show sync code snippet
    console.log(); // Blank line
    consola.info('Download and apply the latest live update in your app using the `sync(...)` method:');
    console.log(); // Blank line
    const syncCode =
      `import { LiveUpdate } from '@capawesome/capacitor-live-update';\n\n` +
      `const sync = async () => {\n` +
      `  // Automatically download the latest update\n` +
      `  const { nextBundleId } = await LiveUpdate.sync();\n` +
      `  if (nextBundleId) {\n` +
      `    // Reload the app to apply the update\n` +
      `    await LiveUpdate.reload();\n` +
      `  }\n` +
      `};`;
    consola.box(syncCode);

    // Ask if user wants to copy to clipboard
    // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
    const shouldCopySync = await prompt('Do you want to copy this code to your clipboard?', {
      type: 'confirm',
      initial: true,
    });

    if (shouldCopySync) {
      try {
        await copyToClipboard(syncCode);
        consola.success('Code copied to clipboard!');
      } catch (error) {
        consola.warn('Failed to copy to clipboard. Please copy the code manually.');
      }
    }

    // Wait for user to apply the code
    // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
    await prompt('Press Enter to continue once you have added this code to your app...', {
      type: 'confirm',
      initial: true,
    });

    // Step 8: Final message and next steps
    console.log(); // Blank line
    consola.success('Live Updates setup completed!');
    console.log(); // Blank line
    consola.info('Next steps:');
    consola.log('  1. Create a new web assets build and sync the Capacitor platforms: `npm run build && npx cap sync`');
    consola.log('  2. Deploy your first live update: `npx @capawesome/cli apps:bundles:create`');
    consola.log('  3. Run the app and test the live update functionality: `npx cap run <platform>`');

    // Show helpful resources
    console.log(); // Blank line
    consola.log('Learn more:');
    consola.log('- Plugin Documentation: https://capawesome.io/plugins/live-update/');
    consola.log('- Update Strategies: https://capawesome.io/cloud/live-updates/guides/update-strategies/');
    consola.log('- Best Practices: https://capawesome.io/cloud/live-updates/guides/best-practices/');
  },
});
