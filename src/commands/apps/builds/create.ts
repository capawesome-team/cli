import { DEFAULT_CONSOLE_BASE_URL } from '@/config/consts.js';
import appBuildsService from '@/services/app-builds.js';
import appCertificatesService from '@/services/app-certificates.js';
import appEnvironmentsService from '@/services/app-environments.js';
import appsService from '@/services/apps.js';
import authorizationService from '@/services/authorization-service.js';
import organizationsService from '@/services/organizations.js';
import { AppBuildArtifactDto } from '@/types/app-build.js';
import { unescapeAnsi } from '@/utils/ansi.js';
import { prompt } from '@/utils/prompt.js';
import { wait } from '@/utils/wait.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import fs from 'fs/promises';
import path from 'path';
import { hasTTY } from 'std-env';
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
      platform: z
        .enum(['ios', 'android'], {
          message: 'Platform must be either `ios` or `android`.',
        })
        .optional()
        .describe('The platform for the build. Supported values are `ios` and `android`.'),
      type: z
        .string()
        .optional()
        .describe(
          'The type of build. For iOS, supported values are `simulator`, `development`, `ad-hoc`, `app-store`, and `enterprise`. For Android, supported values are `debug` and `release`.',
        ),
    }),
  ),
  action: async (options) => {
    let { appId, platform, type, gitRef, environment, certificate } = options;

    // Check if the user is logged in
    if (!authorizationService.hasAuthorizationToken()) {
      consola.error('You must be logged in to run this command.');
      process.exit(1);
    }

    // Validate that detached flag cannot be used with artifact flags
    if (options.detached && (options.apk || options.aab || options.ipa)) {
      consola.error('The --detached flag cannot be used with --apk, --aab, or --ipa flags.');
      process.exit(1);
    }

    // Prompt for app ID if not provided
    if (!appId) {
      if (!hasTTY) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizations = await organizationsService.findAll();
      if (organizations.length === 0) {
        consola.error('You must create an organization before creating a build.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      const organizationId = await prompt('Select the organization of the app for which you want to create a build.', {
        type: 'select',
        options: organizations.map((organization) => ({ label: organization.name, value: organization.id })),
      });
      if (!organizationId) {
        consola.error('You must select the organization of an app for which you want to create a build.');
        process.exit(1);
      }
      const apps = await appsService.findAll({
        organizationId,
      });
      if (apps.length === 0) {
        consola.error('You must create an app before creating a build.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      appId = await prompt('Which app do you want to create a build for:', {
        type: 'select',
        options: apps.map((app) => ({ label: app.name, value: app.id })),
      });
      if (!appId) {
        consola.error('You must select an app to create a build for.');
        process.exit(1);
      }
    }

    // Prompt for platform if not provided
    if (!platform) {
      if (!hasTTY) {
        consola.error('You must provide a platform when running in non-interactive environment.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      platform = await prompt('Select the platform for the build:', {
        type: 'select',
        options: [
          { label: 'Android', value: 'android' },
          { label: 'iOS', value: 'ios' },
        ],
      });
      if (!platform) {
        consola.error('You must select a platform.');
        process.exit(1);
      }
    }

    // Prompt for git ref if not provided
    if (!gitRef) {
      if (!hasTTY) {
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
      type = platform === 'android' ? 'debug' : 'simulator';
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

    // Prompt for environment if not provided
    if (!environment && hasTTY) {
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
    if (!certificate && hasTTY) {
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

    // Create the app build
    consola.start('Creating build...');
    const response = await appBuildsService.create({
      appCertificateName: certificate,
      appEnvironmentName: environment,
      appId,
      gitRef,
      platform,
      type,
    });
    consola.success(`Build created successfully.`);
    consola.info(`Build Number: ${response.numberAsString}`);
    consola.info(`Build ID: ${response.id}`);
    consola.info(`Build URL: ${DEFAULT_CONSOLE_BASE_URL}/apps/${appId}/builds/${response.id}`);

    // Wait for build job to complete by default, unless --detached flag is set
    const shouldWait = !options.detached;
    if (shouldWait) {
      let lastPrintedLogNumber = 0;
      let isWaitingForStart = true;

      // Poll build status until completion
      while (true) {
        try {
          const build = await appBuildsService.findOne({
            appId,
            appBuildId: response.id,
            relations: 'appBuildArtifacts,job,job.jobLogs',
          });

          if (!build.job) {
            await wait(3000);
            continue;
          }

          const jobStatus = build.job.status;

          // Show spinner while queued or pending
          if (jobStatus === 'queued' || jobStatus === 'pending') {
            if (isWaitingForStart) {
              consola.start(`Waiting for build to start (status: ${jobStatus})...`);
            }
            await wait(3000);
            continue;
          }

          // Stop spinner when job moves to in_progress
          if (isWaitingForStart && jobStatus === 'in_progress') {
            isWaitingForStart = false;
            consola.success('Build started...');
          }

          // Print new logs
          if (build.job.jobLogs && build.job.jobLogs.length > 0) {
            const newLogs = build.job.jobLogs
              .filter((log) => log.number > lastPrintedLogNumber)
              .sort((a, b) => a.number - b.number);

            for (const log of newLogs) {
              console.log(unescapeAnsi(log.payload));
              lastPrintedLogNumber = log.number;
            }
          }

          // Handle terminal states
          if (
            jobStatus === 'succeeded' ||
            jobStatus === 'failed' ||
            jobStatus === 'canceled' ||
            jobStatus === 'rejected' ||
            jobStatus === 'timed_out'
          ) {
            console.log(); // New line for better readability
            if (jobStatus === 'succeeded') {
              consola.success('Build completed successfully.');
              console.log(); // New line for better readability

              // Download artifacts if flags are set
              if (options.apk && platform === 'android') {
                await handleArtifactDownload({
                  appId,
                  buildId: response.id,
                  buildArtifacts: build.appBuildArtifacts,
                  artifactType: 'apk',
                  filePath: typeof options.apk === 'string' ? options.apk : undefined,
                });
              }
              if (options.aab && platform === 'android') {
                await handleArtifactDownload({
                  appId,
                  buildId: response.id,
                  buildArtifacts: build.appBuildArtifacts,
                  artifactType: 'aab',
                  filePath: typeof options.aab === 'string' ? options.aab : undefined,
                });
              }
              if (options.ipa && platform === 'ios') {
                await handleArtifactDownload({
                  appId,
                  buildId: response.id,
                  buildArtifacts: build.appBuildArtifacts,
                  artifactType: 'ipa',
                  filePath: typeof options.ipa === 'string' ? options.ipa : undefined,
                });
              }
              process.exit(0);
            } else if (jobStatus === 'failed') {
              consola.error('Build failed.');
              process.exit(1);
            } else if (jobStatus === 'canceled') {
              consola.warn('Build was canceled.');
              process.exit(1);
            } else if (jobStatus === 'rejected') {
              consola.error('Build was rejected.');
              process.exit(1);
            } else if (jobStatus === 'timed_out') {
              consola.error('Build timed out.');
              process.exit(1);
            }
          }

          // Wait before next poll (3 seconds)
          await wait(3000);
        } catch (error) {
          consola.error('Error polling build status:', error);
          process.exit(1);
        }
      }
    }
  },
});

/**
 * Download a build artifact (APK, AAB, or IPA).
 */
const handleArtifactDownload = async (options: {
  appId: string;
  buildId: string;
  buildArtifacts: AppBuildArtifactDto[] | undefined;
  artifactType: 'apk' | 'aab' | 'ipa';
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
