import { DEFAULT_CONSOLE_BASE_URL } from '@/config/consts.js';
import appBundlesService from '@/services/app-bundles.js';
import appsService from '@/services/apps.js';
import authorizationService from '@/services/authorization-service.js';
import organizationsService from '@/services/organizations.js';
import { createBufferFromPath, createBufferFromString, isPrivateKeyContent } from '@/utils/buffer.js';
import { isInteractive } from '@/utils/environment.js';
import { fileExistsAtPath } from '@/utils/file.js';
import { createHash } from '@/utils/hash.js';
import { formatPrivateKey } from '@/utils/private-key.js';
import { prompt } from '@/utils/prompt.js';
import { createSignature } from '@/utils/signature.js';
import zip from '@/utils/zip.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Register a self-hosted bundle URL.',
  options: defineOptions(
    z.object({
      androidMax: z.coerce
        .string()
        .optional()
        .describe('The maximum Android version code (`versionCode`) that the bundle supports.'),
      androidMin: z.coerce
        .string()
        .optional()
        .describe('The minimum Android version code (`versionCode`) that the bundle supports.'),
      androidEq: z.coerce
        .string()
        .optional()
        .describe('The exact Android version code (`versionCode`) that the bundle does not support.'),
      appId: z
        .string({
          message: 'App ID must be a UUID.',
        })
        .uuid({
          message: 'App ID must be a UUID.',
        })
        .optional()
        .describe('App ID to deploy to.'),
      channel: z.string().optional().describe('Channel to associate the bundle with.'),
      commitMessage: z
        .string()
        .optional()
        .describe('The commit message related to the bundle. Deprecated, use `--git-ref` instead.'),
      commitRef: z
        .string()
        .optional()
        .describe('The commit ref related to the bundle. Deprecated, use `--git-ref` instead.'),
      commitSha: z
        .string()
        .optional()
        .describe('The commit sha related to the bundle. Deprecated, use `--git-ref` instead.'),
      customProperty: z
        .array(z.string().min(1).max(100))
        .optional()
        .describe(
          'A custom property to assign to the bundle. Must be in the format `key=value`. Can be specified multiple times.',
        ),
      expiresInDays: z.coerce
        .number({
          message: 'Expiration days must be an integer.',
        })
        .int({
          message: 'Expiration days must be an integer.',
        })
        .optional()
        .describe('The number of days until the bundle is automatically deleted.'),
      gitRef: z
        .string()
        .optional()
        .describe('The Git reference (branch, tag, or commit SHA) to associate with the bundle.'),
      iosMax: z
        .string()
        .optional()
        .describe('The maximum iOS bundle version (`CFBundleVersion`) that the bundle supports.'),
      iosMin: z
        .string()
        .optional()
        .describe('The minimum iOS bundle version (`CFBundleVersion`) that the bundle supports.'),
      iosEq: z
        .string()
        .optional()
        .describe('The exact iOS bundle version (`CFBundleVersion`) that the bundle does not support.'),
      path: z.string().optional().describe('Path to zip file for code signing only.'),
      privateKey: z
        .string()
        .optional()
        .describe(
          'The private key to sign the bundle with. Can be a file path to a .pem file or the private key content as plain text.',
        ),
      rolloutPercentage: z.coerce
        .number()
        .int({
          message: 'Percentage must be an integer.',
        })
        .min(0, {
          message: 'Percentage must be at least 0.',
        })
        .max(100, {
          message: 'Percentage must be at most 100.',
        })
        .optional()
        .describe('The percentage of devices to deploy the bundle to. Must be an integer between 0 and 100.'),
      url: z.string().optional().describe('The url to the self-hosted bundle file.'),
    }),
  ),
  action: async (options, args) => {
    let {
      androidEq,
      androidMax,
      androidMin,
      appId,
      channel,
      commitMessage,
      commitRef,
      commitSha,
      customProperty,
      expiresInDays,
      gitRef,
      iosEq,
      iosMax,
      iosMin,
      path,
      privateKey,
      rolloutPercentage,
      url,
    } = options;

    // Check if the user is logged in
    if (!authorizationService.hasAuthorizationToken()) {
      consola.error('You must be logged in to run this command. Please run the `login` command first.');
      process.exit(1);
    }

    // Calculate the expiration date
    let expiresAt: string | undefined;
    if (expiresInDays) {
      const expiresAtDate = new Date();
      expiresAtDate.setDate(expiresAtDate.getDate() + expiresInDays);
      expiresAt = expiresAtDate.toISOString();
    }

    // Prompt for url if not provided
    if (!url) {
      if (!isInteractive()) {
        consola.error('You must provide a url when running in non-interactive environment.');
        process.exit(1);
      } else {
        url = await prompt('Enter the URL to the self-hosted bundle file:', {
          type: 'text',
        });
        if (!url) {
          consola.error('You must provide a url to the self-hosted bundle file.');
          process.exit(1);
        }
      }
    }

    // Prompt for appId if not provided
    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizations = await organizationsService.findAll();
      if (organizations.length === 0) {
        consola.error('You must create an organization before registering a bundle.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      const organizationId = await prompt(
        'Select the organization of the app for which you want to register a bundle.',
        {
          type: 'select',
          options: organizations.map((organization) => ({ label: organization.name, value: organization.id })),
        },
      );
      if (!organizationId) {
        consola.error('You must select the organization of an app for which you want to register a bundle.');
        process.exit(1);
      }
      const apps = await appsService.findAll({
        organizationId,
      });
      if (apps.length === 0) {
        consola.error('You must create an app before registering a bundle.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      appId = await prompt('Which app do you want to deploy to:', {
        type: 'select',
        options: apps.map((app) => ({ label: app.name, value: app.id })),
      });
      if (!appId) {
        consola.error('You must select an app to deploy to.');
        process.exit(1);
      }
    }

    // Prompt for channel if interactive
    if (!channel && isInteractive()) {
      const shouldDeployToChannel = await prompt('Do you want to deploy to a specific channel?', {
        type: 'confirm',
        initial: false,
      });
      if (shouldDeployToChannel) {
        channel = await prompt('Enter the channel name:', {
          type: 'text',
        });
        if (!channel) {
          consola.error('The channel name must be at least one character long.');
          process.exit(1);
        }
      }
    }

    // Handle checksum and signature generation if path is provided
    let checksum: string | undefined;
    let signature: string | undefined;
    if (path) {
      // Validate that path is a zip file
      if (!zip.isZipped(path)) {
        consola.error('The path must be a zip file when providing a URL.');
        process.exit(1);
      }

      // Check if the path exists
      const pathExists = await fileExistsAtPath(path);
      if (!pathExists) {
        consola.error(`The path does not exist.`);
        process.exit(1);
      }

      // Create the file buffer
      const fileBuffer = await createBufferFromPath(path);

      // Generate checksum
      checksum = await createHash(fileBuffer);

      // Handle private key for signing
      if (privateKey) {
        let privateKeyBuffer: Buffer;
        if (isPrivateKeyContent(privateKey)) {
          // Handle plain text private key content
          const formattedPrivateKey = formatPrivateKey(privateKey);
          privateKeyBuffer = createBufferFromString(formattedPrivateKey);
        } else if (privateKey.endsWith('.pem')) {
          // Handle file path
          const fileExists = await fileExistsAtPath(privateKey);
          if (fileExists) {
            const keyBuffer = await createBufferFromPath(privateKey);
            const keyContent = keyBuffer.toString('utf8');
            const formattedPrivateKey = formatPrivateKey(keyContent);
            privateKeyBuffer = createBufferFromString(formattedPrivateKey);
          } else {
            consola.error('Private key file not found.');
            process.exit(1);
          }
        } else {
          consola.error('Private key must be either a path to a .pem file or the private key content as plain text.');
          process.exit(1);
        }

        // Sign the bundle
        signature = await createSignature(privateKeyBuffer, fileBuffer);
      }
    }

    // Create the app bundle
    consola.start('Registering bundle...');
    const response = await appBundlesService.create({
      appId,
      artifactType: 'zip',
      channelName: channel,
      checksum,
      eqAndroidAppVersionCode: androidEq,
      eqIosAppVersionCode: iosEq,
      gitCommitMessage: commitMessage,
      gitCommitRef: commitRef,
      gitCommitSha: commitSha,
      gitRef,
      customProperties: parseCustomProperties(customProperty),
      expiresAt,
      url,
      maxAndroidAppVersionCode: androidMax,
      maxIosAppVersionCode: iosMax,
      minAndroidAppVersionCode: androidMin,
      minIosAppVersionCode: iosMin,
      rolloutPercentage: (rolloutPercentage ?? 100) / 100,
      signature,
    });

    consola.info(`Bundle Artifact ID: ${response.id}`);
    consola.info(`Deployment URL: ${DEFAULT_CONSOLE_BASE_URL}/apps/${appId}/deployments/${response.appDeploymentId}`);
    consola.success('Live Update successfully registered.');
  },
});

const parseCustomProperties = (customProperty: string[] | undefined): Record<string, string> | undefined => {
  let customProperties: Record<string, string> | undefined;
  if (customProperty) {
    customProperties = {};
    for (const property of customProperty) {
      const [key, value] = property.split('=');
      if (key && value) {
        customProperties[key] = value;
      }
    }
  }
  return customProperties;
};
