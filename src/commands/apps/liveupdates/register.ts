import { DEFAULT_CONSOLE_BASE_URL } from '@/config/consts.js';
import appBundlesService from '@/services/app-bundles.js';
import appsService from '@/services/apps.js';
import { withAuth } from '@/utils/auth.js';
import { createBufferFromPath, createBufferFromString, isPrivateKeyContent } from '@/utils/buffer.js';
import { isInteractive } from '@/utils/environment.js';
import { fileExistsAtPath } from '@/utils/file.js';
import { createHash } from '@/utils/hash.js';
import { formatPrivateKey } from '@/utils/private-key.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
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
      yes: z.boolean().optional().describe('Skip confirmation prompts.'),
    }),
    { y: 'yes' },
  ),
  action: withAuth(async (options, args) => {
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
      const organizationId = await promptOrganizationSelection();
      appId = await promptAppSelection(organizationId);
    }

    // Prompt for channel if interactive
    if (!channel && !options.yes && isInteractive()) {
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

    // Get app details for confirmation
    const app = await appsService.findOne({ appId });
    const appName = app.name;

    // Final confirmation before registering bundle
    if (!options.yes && isInteractive()) {
      const confirmed = await prompt(
        `Are you sure you want to register bundle from URL "${url}" for app "${appName}" (${appId})?`,
        {
          type: 'confirm',
        },
      );
      if (!confirmed) {
        consola.info('Bundle registration cancelled.');
        process.exit(0);
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
    if (response.appDeploymentId) {
      consola.info(`Deployment URL: ${DEFAULT_CONSOLE_BASE_URL}/apps/${appId}/deployments/${response.appDeploymentId}`);
    }
    consola.success('Live Update successfully registered.');
  }),
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
