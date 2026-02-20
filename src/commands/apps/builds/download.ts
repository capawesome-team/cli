import appBuildsService from '@/services/app-builds.js';
import appsService from '@/services/apps.js';
import organizationsService from '@/services/organizations.js';
import { withAuth } from '@/utils/auth.js';
import { prompt } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import fs from 'fs/promises';
import path from 'path';
import { isInteractive } from '@/utils/environment.js';
import { z } from 'zod';

export default defineCommand({
  description: 'Download an app build.',
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
        .describe('Build ID to download.'),
      apk: z
        .union([z.boolean(), z.string()])
        .optional()
        .describe('Download the APK artifact. Optionally provide a file path.'),
      aab: z
        .union([z.boolean(), z.string()])
        .optional()
        .describe('Download the AAB artifact. Optionally provide a file path.'),
      ipa: z
        .union([z.boolean(), z.string()])
        .optional()
        .describe('Download the IPA artifact. Optionally provide a file path.'),
      zip: z
        .union([z.boolean(), z.string()])
        .optional()
        .describe('Download the ZIP artifact. Optionally provide a file path.'),
    }),
  ),
  action: withAuth(async (options) => {
    let { appId, buildId } = options;

    // Prompt for app ID if not provided
    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizations = await organizationsService.findAll();
      if (organizations.length === 0) {
        consola.error('You must create an organization before downloading a build.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      const organizationId = await prompt(
        'Select the organization of the app for which you want to download a build:',
        {
          type: 'select',
          options: organizations.map((organization) => ({ label: organization.name, value: organization.id })),
        },
      );
      if (!organizationId) {
        consola.error('You must select the organization of an app for which you want to download a build.');
        process.exit(1);
      }
      const apps = await appsService.findAll({
        organizationId,
      });
      if (apps.length === 0) {
        consola.error('You must create an app before downloading a build.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      appId = await prompt('Select the app for which you want to download a build:', {
        type: 'select',
        options: apps.map((app) => ({ label: app.name, value: app.id })),
      });
      if (!appId) {
        consola.error('You must select an app to download a build for.');
        process.exit(1);
      }
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
      buildId = await prompt('Select the build you want to download:', {
        type: 'select',
        options: builds.map((build) => ({
          label: `Build #${build.numberAsString || build.id} (${build.platform} - ${build.type})`,
          value: build.id,
        })),
      });
      if (!buildId) {
        consola.error('You must select a build to download.');
        process.exit(1);
      }
    }

    // Fetch the build details to get the job ID
    const build = await appBuildsService.findOne({ appId, appBuildId: buildId, relations: 'appBuildArtifacts,job' });
    if (build.job?.status !== 'succeeded') {
      consola.error('The build has not succeeded yet. Cannot download artifacts for incomplete builds.');
      process.exit(1);
    }

    // Validate platform-specific artifact flags
    if (build.platform === 'android' && options.ipa) {
      consola.error('Cannot download IPA artifact for an Android build.');
      process.exit(1);
    }
    if (build.platform === 'ios' && (options.apk || options.aab)) {
      consola.error('Cannot download APK or AAB artifacts for an iOS build.');
      process.exit(1);
    }
    if (build.platform === 'web' && (options.apk || options.aab || options.ipa)) {
      consola.error('Cannot download APK, AAB, or IPA artifacts for a Web build.');
      process.exit(1);
    }

    // Determine which artifacts to download
    let downloadApk = options.apk;
    let downloadAab = options.aab;
    let downloadIpa = options.ipa;
    let downloadZip = options.zip;

    // Prompt for artifact types if none were provided
    if (!downloadApk && !downloadAab && !downloadIpa && !downloadZip) {
      if (!isInteractive()) {
        consola.error(
          'You must specify at least one artifact type (--apk, --aab, --ipa, or --zip) when running in non-interactive environment.',
        );
        process.exit(1);
      }

      // Get available artifact types from the build
      const availableArtifacts =
        build.appBuildArtifacts?.filter((artifact) => artifact.status === 'ready').map((artifact) => artifact.type) ||
        [];

      if (availableArtifacts.length === 0) {
        consola.error('No artifacts available for download.');
        process.exit(1);
      }

      // Create options based on available artifacts and platform
      const artifactOptions = [];
      if (build.platform === 'android') {
        if (availableArtifacts.includes('apk')) {
          artifactOptions.push({ label: 'APK', value: 'apk' });
        }
        if (availableArtifacts.includes('aab')) {
          artifactOptions.push({ label: 'AAB', value: 'aab' });
        }
      } else if (build.platform === 'ios') {
        if (availableArtifacts.includes('ipa')) {
          artifactOptions.push({ label: 'IPA', value: 'ipa' });
        }
      } else if (build.platform === 'web') {
        if (availableArtifacts.includes('zip')) {
          artifactOptions.push({ label: 'ZIP', value: 'zip' });
        }
      }

      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      const selectedArtifacts: string[] = await prompt('Which artifact type(s) do you want to download:', {
        type: 'multiselect',
        options: artifactOptions,
      });

      if (!selectedArtifacts || selectedArtifacts.length === 0) {
        consola.error('You must select at least one artifact type to download.');
        process.exit(1);
      }

      // Set flags based on selection
      downloadApk = (selectedArtifacts as string[]).includes('apk');
      downloadAab = (selectedArtifacts as string[]).includes('aab');
      downloadIpa = (selectedArtifacts as string[]).includes('ipa');
      downloadZip = (selectedArtifacts as string[]).includes('zip');
    }

    // Download artifacts if flags are set
    if (downloadApk) {
      await handleArtifactDownload({
        appId,
        buildId: buildId!,
        buildArtifacts: build.appBuildArtifacts,
        artifactType: 'apk',
        filePath: typeof options.apk === 'string' ? options.apk : undefined,
      });
    }
    if (downloadAab) {
      await handleArtifactDownload({
        appId,
        buildId: buildId!,
        buildArtifacts: build.appBuildArtifacts,
        artifactType: 'aab',
        filePath: typeof options.aab === 'string' ? options.aab : undefined,
      });
    }
    if (downloadIpa) {
      await handleArtifactDownload({
        appId,
        buildId: buildId!,
        buildArtifacts: build.appBuildArtifacts,
        artifactType: 'ipa',
        filePath: typeof options.ipa === 'string' ? options.ipa : undefined,
      });
    }
    if (downloadZip) {
      await handleArtifactDownload({
        appId,
        buildId: buildId!,
        buildArtifacts: build.appBuildArtifacts,
        artifactType: 'zip',
        filePath: typeof options.zip === 'string' ? options.zip : undefined,
      });
    }
  }),
});

/**
 * Download a build artifact (APK, AAB, IPA, or ZIP).
 */
const handleArtifactDownload = async (options: {
  appId: string;
  buildId: string;
  buildArtifacts: any[] | undefined;
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
