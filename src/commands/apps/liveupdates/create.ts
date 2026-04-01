import { DEFAULT_CONSOLE_BASE_URL } from '@/config/consts.js';
import appBuildSourcesService from '@/services/app-build-sources.js';
import appBuildsService from '@/services/app-builds.js';
import appCertificatesService from '@/services/app-certificates.js';
import appDeploymentsService from '@/services/app-deployments.js';
import appEnvironmentsService from '@/services/app-environments.js';
import { parseKeyValuePairs } from '@/utils/app-environments.js';
import { withAuth } from '@/utils/auth.js';
import { parseCustomProperties } from '@/utils/custom-properties.js';
import { isInteractive } from '@/utils/environment.js';
import { waitForJobCompletion } from '@/utils/job.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import zip from '@/utils/zip.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';

export default defineCommand({
  description: 'Create a new live update by building and deploying web assets using Capawesome Cloud Runners.',
  options: defineOptions(
    z.object({
      androidEq: z.string().optional().describe('The exact Android versionCode for the live update.'),
      androidMax: z.string().optional().describe('The maximum Android versionCode for the live update.'),
      androidMin: z.string().optional().describe('The minimum Android versionCode for the live update.'),
      appId: z
        .uuid({
          message: 'App ID must be a UUID.',
        })
        .optional()
        .describe('App ID to create the live update for.'),
      certificate: z.string().optional().describe('The name of the certificate to use for the build.'),
      channel: z.string().optional().describe('The name of the channel to deploy to.'),
      customProperty: z
        .array(z.string().min(1).max(100))
        .max(10)
        .optional()
        .describe(
          'A custom property to assign to the build. Must be in the format `key=value`. Can be specified multiple times.',
        ),
      environment: z.string().optional().describe('The name of the environment to use for the build.'),
      gitRef: z.string().optional().describe('The Git reference (branch, tag, or commit SHA) to build.'),
      iosEq: z.string().optional().describe('The exact iOS CFBundleVersion for the live update.'),
      iosMax: z.string().optional().describe('The maximum iOS CFBundleVersion for the live update.'),
      iosMin: z.string().optional().describe('The minimum iOS CFBundleVersion for the live update.'),
      json: z.boolean().optional().describe('Output in JSON format.'),
      path: z.string().optional().describe('Path to local source files to upload.'),
      rolloutPercentage: z.coerce
        .number()
        .int()
        .min(0)
        .max(100)
        .optional()
        .describe('The rollout percentage for the deployment (0-100). Default: 100.'),
      stack: z
        .enum(['macos-sequoia', 'macos-tahoe'], {
          message: 'Build stack must be either `macos-sequoia` or `macos-tahoe`.',
        })
        .optional()
        .describe('The build stack to use for the build process.'),
      url: z.string().optional().describe('URL to a zip file to use as build source.'),
      variable: z
        .array(z.string())
        .optional()
        .describe('Ad hoc environment variable in key=value format. Can be specified multiple times.'),
      variableFile: z
        .string()
        .optional()
        .describe('Path to a file containing ad hoc environment variables in .env format.'),
      yes: z.boolean().optional().describe('Skip confirmation prompts.'),
    }),
    { y: 'yes' },
  ),
  action: withAuth(async (options) => {
    let { appId, certificate, channel, gitRef, environment, json, stack, path: sourcePath, url } = options;

    // Validate that path, url, and gitRef cannot be used together
    if (sourcePath && gitRef) {
      consola.error('The --path and --git-ref flags cannot be used together.');
      process.exit(1);
    }
    if (url && gitRef) {
      consola.error('The --url and --git-ref flags cannot be used together.');
      process.exit(1);
    }
    if (url && sourcePath) {
      consola.error('The --url and --path flags cannot be used together.');
      process.exit(1);
    }

    // Validate url if provided
    if (url) {
      consola.warn('The --url option is experimental and may change in the future.');
    }

    // Validate path if provided
    if (sourcePath) {
      consola.warn('The --path option is experimental and may change in the future.');
      const resolvedPath = path.resolve(sourcePath);
      const stat = await fs.stat(resolvedPath).catch(() => null);
      if (!stat || !stat.isDirectory()) {
        consola.error('The --path must point to an existing directory.');
        process.exit(1);
      }
      const packageJsonPath = path.join(resolvedPath, 'package.json');
      const packageJsonStat = await fs.stat(packageJsonPath).catch(() => null);
      if (!packageJsonStat || !packageJsonStat.isFile()) {
        consola.error('The directory specified by --path must contain a package.json file.');
        process.exit(1);
      }
    }

    // Prompt for app ID if not provided
    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizationId = await promptOrganizationSelection({ allowCreate: true });
      appId = await promptAppSelection(organizationId, { allowCreate: true });
    }

    // Prompt for git ref if not provided and no path or url specified
    if (!sourcePath && !url && !gitRef) {
      if (!isInteractive()) {
        consola.error('You must provide a git ref, path, or url when running in non-interactive environment.');
        process.exit(1);
      }
      gitRef = await prompt('Enter the Git reference (branch, tag, or commit SHA):', {
        type: 'text',
      });
      if (!gitRef) {
        consola.error('You must provide a git ref.');
        process.exit(1);
      }
    }

    // Prompt for channel if not provided
    if (!channel) {
      if (!isInteractive()) {
        consola.error('You must provide a channel when running in non-interactive environment.');
        process.exit(1);
      }
      channel = await prompt('Enter the channel name to deploy to:', {
        type: 'text',
      });
      if (!channel) {
        consola.error('You must provide a channel.');
        process.exit(1);
      }
    }

    // Prompt for environment if not provided
    if (!environment && !options.yes && isInteractive()) {
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      const selectEnvironment = await prompt('Do you want to select an environment?', {
        type: 'confirm',
        initial: false,
      });
      if (selectEnvironment) {
        const environments = await appEnvironmentsService.findAll({ appId });
        if (environments.length === 0) {
          consola.warn('No environments found for this app.');
        } else {
          // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
          environment = await prompt('Select the environment for the build:', {
            type: 'select',
            options: environments.map((env) => ({ label: env.name, value: env.name })),
          });
        }
      }
    }

    // Prompt for certificate if not provided
    if (!certificate && !options.yes && isInteractive()) {
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      const selectCertificate = await prompt('Do you want to select a certificate?', {
        type: 'confirm',
        initial: false,
      });
      if (selectCertificate) {
        const certificates = await appCertificatesService.findAll({ appId, platform: 'web' });
        if (certificates.length === 0) {
          consola.warn('No certificates found for this app.');
        } else {
          // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
          certificate = await prompt('Select the certificate for the build:', {
            type: 'select',
            options: certificates.map((cert) => ({ label: cert.name, value: cert.name })),
          });
        }
      }
    }

    // Parse ad hoc environment variables from inline and file
    const variablesMap = new Map<string, string>();
    if (options.variableFile) {
      const fileContent = await fs.readFile(options.variableFile, 'utf-8');
      const fileVariables = parseKeyValuePairs(fileContent);
      fileVariables.forEach((v) => variablesMap.set(v.key, v.value));
    }
    if (options.variable) {
      const inlineVariables = parseKeyValuePairs(options.variable.join('\n'));
      inlineVariables.forEach((v) => variablesMap.set(v.key, v.value));
    }
    const adHocEnvironmentVariables = variablesMap.size > 0 ? Object.fromEntries(variablesMap) : undefined;

    // Create build source from URL if provided
    let appBuildSourceId: string | undefined;
    if (url) {
      consola.start('Creating build source from URL...');
      const appBuildSource = await appBuildSourcesService.createFromUrl({ appId, fileUrl: url });
      appBuildSourceId = appBuildSource.id;
      consola.success('Build source created successfully.');
    }

    // Upload source files if path is provided
    if (sourcePath) {
      const resolvedPath = path.resolve(sourcePath);
      consola.start('Zipping source files...');
      const buffer = await zip.zipFolderWithGitignore(resolvedPath);
      consola.start('Uploading source files...');
      const appBuildSource = await appBuildSourcesService.createFromFile(
        {
          appId,
          fileSizeInBytes: buffer.byteLength,
          buffer,
          name: 'source.zip',
        },
        (currentPart, totalParts) => {
          consola.start(`Uploading source files (${currentPart}/${totalParts})...`);
        },
      );
      appBuildSourceId = appBuildSource.id;
      consola.success('Source files uploaded successfully.');
    }

    // Create the web build
    consola.start('Creating build...');
    const response = await appBuildsService.create({
      adHocEnvironmentVariables,
      appBuildSourceId,
      appCertificateName: certificate,
      appEnvironmentName: environment,
      appId,
      stack,
      gitRef,
      platform: 'web',
    });
    consola.info(`Build ID: ${response.id}`);
    consola.info(`Build Number: ${response.numberAsString}`);
    consola.info(`Build URL: ${DEFAULT_CONSOLE_BASE_URL}/apps/${appId}/builds/${response.id}`);
    consola.success('Build created successfully.');

    // Wait for build to complete
    await waitForJobCompletion({ jobId: response.jobId });
    consola.success('Build completed successfully.');
    console.log();

    // Update build with custom properties and version constraints if any are provided
    const customProperties = parseCustomProperties(options.customProperty);
    const hasUpdateFields =
      customProperties ||
      options.androidMin ||
      options.androidMax ||
      options.androidEq ||
      options.iosMin ||
      options.iosMax ||
      options.iosEq;
    if (hasUpdateFields) {
      consola.start('Updating build...');
      await appBuildsService.update({
        appId,
        appBuildId: response.id,
        customProperties,
        minAndroidAppVersionCode: options.androidMin,
        maxAndroidAppVersionCode: options.androidMax,
        eqAndroidAppVersionCode: options.androidEq,
        minIosAppVersionCode: options.iosMin,
        maxIosAppVersionCode: options.iosMax,
        eqIosAppVersionCode: options.iosEq,
      });
      consola.success('Build updated successfully.');
    }

    // Deploy to channel
    consola.start('Creating deployment...');
    const rolloutPercentage = (options.rolloutPercentage ?? 100) / 100;
    const deployment = await appDeploymentsService.create({
      appId,
      appBuildId: response.id,
      appChannelName: channel,
      rolloutPercentage,
    });
    consola.info(`Deployment ID: ${deployment.id}`);
    consola.info(`Deployment URL: ${DEFAULT_CONSOLE_BASE_URL}/apps/${appId}/deployments/${deployment.id}`);
    consola.success('Deployment created successfully.');

    // Output JSON if json flag is set
    if (json) {
      console.log(
        JSON.stringify(
          {
            buildId: response.id,
            buildNumberAsString: response.numberAsString,
            deploymentId: deployment.id,
          },
          null,
          2,
        ),
      );
    }
  }),
});
