import { DEFAULT_CONSOLE_BASE_URL } from '@/config/consts.js';
import appBuildsService from '@/services/app-builds.js';
import appCertificatesService from '@/services/app-certificates.js';
import appEnvironmentsService from '@/services/app-environments.js';
import { AppBuildArtifactDto } from '@/types/app-build.js';
import { parseKeyValuePairs } from '@/utils/app-environments.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { waitForJobCompletion } from '@/utils/job.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';

const IOS_BUILD_TYPES = ['simulator', 'development', 'ad-hoc', 'app-store', 'enterprise'] as const;
const ANDROID_BUILD_TYPES = ['debug', 'release'] as const;

export default defineCommand({
  description: 'Create a new app build.',
  options: defineOptions(
    z.object({
      aab: z
        .union([z.boolean(), z.string()])
        .optional()
        .describe('Download the generated AAB file (Android only). Optionally provide a file path.'),
      apk: z
        .union([z.boolean(), z.string()])
        .optional()
        .describe('Download the generated APK file (Android only). Optionally provide a file path.'),
      appId: z
        .uuid({
          message: 'App ID must be a UUID.',
        })
        .optional()
        .describe('App ID to create the build for.'),
      certificate: z.string().optional().describe('The name of the certificate to use for the build.'),
      channel: z.string().optional().describe('The name of the channel to deploy to (Web only).'),
      destination: z.string().optional().describe('The name of the destination to deploy to (Android/iOS only).'),
      detached: z
        .boolean()
        .optional()
        .describe('Exit immediately after creating the build without waiting for completion.'),
      environment: z.string().optional().describe('The name of the environment to use for the build.'),
      gitRef: z.string().optional().describe('The Git reference (branch, tag, or commit SHA) to build.'),
      ipa: z
        .union([z.boolean(), z.string()])
        .optional()
        .describe('Download the generated IPA file (iOS only). Optionally provide a file path.'),
      json: z.boolean().optional().describe('Output in JSON format.'),
      platform: z
        .enum(['ios', 'android', 'web'], {
          message: 'Platform must be either `ios`, `android`, or `web`.',
        })
        .optional()
        .describe('The platform for the build. Supported values are `ios`, `android`, and `web`.'),
      stack: z
        .enum(['macos-sequoia', 'macos-tahoe'], {
          message: 'Build stack must be either `macos-sequoia` or `macos-tahoe`.',
        })
        .optional()
        .describe('The build stack to use for the build process.'),
      type: z
        .string()
        .optional()
        .describe(
          'The type of build. For iOS, supported values are `simulator`, `development`, `ad-hoc`, `app-store`, and `enterprise`. For Android, supported values are `debug` and `release`. For Web, no type is required.',
        ),
      variable: z
        .array(z.string())
        .optional()
        .describe('Ad hoc environment variable in key=value format. Can be specified multiple times.'),
      variableFile: z
        .string()
        .optional()
        .describe('Path to a file containing ad hoc environment variables in .env format.'),
      zip: z
        .union([z.boolean(), z.string()])
        .optional()
        .describe('Download the generated ZIP file (Web only). Optionally provide a file path.'),
      yes: z.boolean().optional().describe('Skip confirmation prompts.'),
    }),
    { y: 'yes' },
  ),
  action: withAuth(async (options) => {
    let { appId, platform, type, gitRef, environment, certificate, json, stack } = options;

    // Validate that detached flag cannot be used with artifact flags
    if (options.detached && (options.apk || options.aab || options.ipa || options.zip)) {
      consola.error('The --detached flag cannot be used with --apk, --aab, --ipa, or --zip flags.');
      process.exit(1);
    }

    // Validate that detached flag cannot be used with channel or destination
    if (options.detached && (options.channel || options.destination)) {
      consola.error('The --detached flag cannot be used with --channel or --destination flags.');
      process.exit(1);
    }

    // Validate that channel and destination cannot be used together
    if (options.channel && options.destination) {
      consola.error('The --channel and --destination flags cannot be used together.');
      process.exit(1);
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

    // Prompt for platform if not provided
    if (!platform) {
      if (!isInteractive()) {
        consola.error('You must provide a platform when running in non-interactive environment.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      platform = await prompt('Select the platform for the build:', {
        type: 'select',
        options: [
          { label: 'Android', value: 'android' },
          { label: 'iOS', value: 'ios' },
          { label: 'Web', value: 'web' },
        ],
      });
      if (!platform) {
        consola.error('You must select a platform.');
        process.exit(1);
      }
    }

    // Prompt for git ref if not provided
    if (!gitRef) {
      if (!isInteractive()) {
        consola.error('You must provide a git ref when running in non-interactive environment.');
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

    // Set default type based on platform if not provided
    if (!type) {
      if (platform === 'android') {
        type = 'debug';
      } else if (platform === 'ios') {
        type = 'simulator';
      }
    }

    // Validate type based on platform
    if (platform === 'ios' && !IOS_BUILD_TYPES.includes(type as any)) {
      consola.error(
        `Invalid build type for iOS. Supported values are: ${IOS_BUILD_TYPES.map((t) => `\`${t}\``).join(', ')}.`,
      );
      process.exit(1);
    }
    if (platform === 'android' && !ANDROID_BUILD_TYPES.includes(type as any)) {
      consola.error(
        `Invalid build type for Android. Supported values are: ${ANDROID_BUILD_TYPES.map((t) => `\`${t}\``).join(', ')}.`,
      );
      process.exit(1);
    }

    // Validate that channel is only used with web platform
    if (options.channel && platform !== 'web') {
      consola.error('The --channel flag can only be used with the web platform.');
      process.exit(1);
    }

    // Validate that destination is only used with non-web platforms
    if (options.destination && platform === 'web') {
      consola.error('The --destination flag cannot be used with the web platform.');
      process.exit(1);
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
        const certificates = await appCertificatesService.findAll({ appId, platform });
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

    // Create the app build
    consola.start('Creating build...');
    const response = await appBuildsService.create({
      adHocEnvironmentVariables,
      appCertificateName: certificate,
      appEnvironmentName: environment,
      appId,
      stack,
      gitRef,
      platform,
      type,
    });
    consola.info(`Build ID: ${response.id}`);
    consola.info(`Build Number: ${response.numberAsString}`);
    consola.info(`Build URL: ${DEFAULT_CONSOLE_BASE_URL}/apps/${appId}/builds/${response.id}`);
    consola.success('Build created successfully.');

    // Wait for build job to complete by default, unless --detached flag is set
    const shouldWait = !options.detached;
    if (shouldWait) {
      await waitForJobCompletion({ jobId: response.jobId });
      const appBuild = await appBuildsService.findOne({
        appId,
        appBuildId: response.id,
        relations: 'appBuildArtifacts',
      });

      consola.info(`Build ID: ${response.id}`);
      consola.info(`Build Number: ${response.numberAsString}`);
      consola.info(`Build URL: ${DEFAULT_CONSOLE_BASE_URL}/apps/${appId}/builds/${response.id}`);
      consola.success('Build completed successfully.');
      console.log();

      // Download artifacts if flags are set
      if (options.apk && platform === 'android') {
        await handleArtifactDownload({
          appId,
          buildId: response.id,
          buildArtifacts: appBuild.appBuildArtifacts,
          artifactType: 'apk',
          filePath: typeof options.apk === 'string' ? options.apk : undefined,
        });
      }
      if (options.aab && platform === 'android') {
        await handleArtifactDownload({
          appId,
          buildId: response.id,
          buildArtifacts: appBuild.appBuildArtifacts,
          artifactType: 'aab',
          filePath: typeof options.aab === 'string' ? options.aab : undefined,
        });
      }
      if (options.ipa && platform === 'ios') {
        await handleArtifactDownload({
          appId,
          buildId: response.id,
          buildArtifacts: appBuild.appBuildArtifacts,
          artifactType: 'ipa',
          filePath: typeof options.ipa === 'string' ? options.ipa : undefined,
        });
      }
      if (options.zip && platform === 'web') {
        await handleArtifactDownload({
          appId,
          buildId: response.id,
          buildArtifacts: appBuild.appBuildArtifacts,
          artifactType: 'zip',
          filePath: typeof options.zip === 'string' ? options.zip : undefined,
        });
      }
      // Output JSON if json flag is set
      if (json) {
        console.log(
          JSON.stringify(
            {
              id: response.id,
              numberAsString: response.numberAsString,
            },
            null,
            2,
          ),
        );
      }
    } else {
      if (json) {
        console.log(
          JSON.stringify(
            {
              id: response.id,
              numberAsString: response.numberAsString,
            },
            null,
            2,
          ),
        );
      } else {
        consola.info(`Build ID: ${response.id}`);
        consola.info(`Build Number: ${response.numberAsString}`);
        consola.info(`Build URL: ${DEFAULT_CONSOLE_BASE_URL}/apps/${appId}/builds/${response.id}`);
        consola.success(`Build completed successfully.`);
      }
    }

    // Create deployment if channel or destination is set
    if (options.channel || options.destination) {
      await (
        await import('@/commands/apps/deployments/create.js').then((mod) => mod.default)
      ).action({ appId, buildId: response.id, channel: options.channel, destination: options.destination }, undefined);
    }
  }),
});

/**
 * Download a build artifact (APK, AAB, IPA, or ZIP).
 */
const handleArtifactDownload = async (options: {
  appId: string;
  buildId: string;
  buildArtifacts: AppBuildArtifactDto[] | undefined;
  artifactType: 'apk' | 'aab' | 'ipa' | 'zip';
  filePath?: string;
}): Promise<void> => {
  const { appId, buildId, buildArtifacts, artifactType, filePath } = options;

  try {
    const artifactTypeUpper = artifactType.toUpperCase();
    consola.start(`Downloading ${artifactTypeUpper}...`);

    // Find the artifact
    const artifact = buildArtifacts?.find((artifact) => artifact.type === artifactType);

    if (!artifact) {
      consola.warn(`No ${artifactTypeUpper} artifact found for this build.`);
      return;
    }

    if (artifact.status !== 'ready') {
      consola.warn(`${artifactTypeUpper} artifact is not ready (status: ${artifact.status}).`);
      return;
    }

    // Download the artifact
    const artifactData = await appBuildsService.downloadArtifact({
      appId,
      appBuildId: buildId,
      artifactId: artifact.id,
    });

    // Determine the file path
    let outputPath: string;
    if (filePath) {
      // Use provided path (can be relative or absolute)
      outputPath = path.resolve(filePath);
    } else {
      // Default to current working directory with build ID as filename
      outputPath = path.resolve(`${buildId}.${artifactType}`);
    }

    // Save the file
    await fs.writeFile(outputPath, Buffer.from(artifactData));

    consola.success(`${artifactTypeUpper} downloaded successfully: ${outputPath}`);
  } catch (error) {
    consola.error(`Failed to download ${artifactType.toUpperCase()}:`, error);
  }
};
