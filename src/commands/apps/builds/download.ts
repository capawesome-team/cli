import appBuildsService from '@/services/app-builds.js';
import {
  APP_BUILD_ARTIFACT_FORM_FACTORS,
  APP_BUILD_ARTIFACT_LABELS,
  APP_BUILD_ARTIFACT_TYPES_BY_PLATFORM,
  AppBuildArtifactType,
  handleAppBuildArtifactDownload,
} from '@/utils/app-build-artifacts.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import consola from 'consola';
import { z } from 'zod';
import { defineCommand, defineOptions } from 'zodline';

const ARTIFACT_TYPES: AppBuildArtifactType[] = ['apk', 'aab', 'ipa', 'app', 'zip'];

const PLATFORM_LABELS = {
  android: 'Android',
  ios: 'iOS',
  web: 'Web',
};

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
      formFactor: z
        .enum(APP_BUILD_ARTIFACT_FORM_FACTORS, {
          message: 'Invalid form factor. Must be one of `mobile`, `watch`, `tv`, or `automotive`.',
        })
        .optional()
        .describe(
          'The form factor of the Android artifact to download. Supported values are `mobile`, `watch`, `tv`, and `automotive`. Without it, the first artifact in the order `mobile`, `watch`, `tv`, `automotive` is downloaded.',
        ),
      apk: z
        .union([z.boolean(), z.string()])
        .optional()
        .describe('Download the APK artifact (Android only). Optionally provide a file path.'),
      aab: z
        .union([z.boolean(), z.string()])
        .optional()
        .describe('Download the AAB artifact (Android only). Optionally provide a file path.'),
      ipa: z
        .union([z.boolean(), z.string()])
        .optional()
        .describe('Download the IPA artifact (iOS only). Optionally provide a file path.'),
      app: z
        .union([z.boolean(), z.string()])
        .optional()
        .describe(
          'Download the APP artifact, a zipped `.app` bundle (iOS simulator builds only). Optionally provide a file path.',
        ),
      zip: z
        .union([z.boolean(), z.string()])
        .optional()
        .describe('Download the ZIP artifact (Web only). Optionally provide a file path.'),
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
      const organizationId = await promptOrganizationSelection();
      appId = await promptAppSelection(organizationId);
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

    const build = await appBuildsService.findOne({ appId, appBuildId: buildId, relations: 'appBuildArtifacts,job' });
    if (build.job?.status !== 'succeeded') {
      consola.error('The build has not succeeded yet. Cannot download artifacts for incomplete builds.');
      process.exit(1);
    }

    // Reject artifact flags that do not exist for the build's platform
    const supportedArtifactTypes = APP_BUILD_ARTIFACT_TYPES_BY_PLATFORM[build.platform];
    const requestedArtifactTypes = ARTIFACT_TYPES.filter((artifactType) => options[artifactType]);
    const unsupportedArtifactType = requestedArtifactTypes.find(
      (artifactType) => !supportedArtifactTypes.includes(artifactType),
    );
    if (unsupportedArtifactType) {
      consola.error(
        `The ${APP_BUILD_ARTIFACT_LABELS[unsupportedArtifactType]} artifact is not available for ${PLATFORM_LABELS[build.platform]} builds.`,
      );
      process.exit(1);
    }

    // Prompt for artifact types if none were provided
    let artifactTypesToDownload = requestedArtifactTypes;
    if (artifactTypesToDownload.length === 0) {
      if (!isInteractive()) {
        consola.error(
          'You must specify at least one artifact type (--apk, --aab, --ipa, --app, or --zip) when running in non-interactive environment.',
        );
        process.exit(1);
      }
      const availableArtifactTypes = supportedArtifactTypes.filter((artifactType) =>
        build.appBuildArtifacts?.some((artifact) => artifact.type === artifactType && artifact.status === 'ready'),
      );
      if (availableArtifactTypes.length === 0) {
        consola.error('No artifacts available for download.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      artifactTypesToDownload = await prompt('Which artifact type(s) do you want to download:', {
        type: 'multiselect',
        options: availableArtifactTypes.map((artifactType) => ({
          label: APP_BUILD_ARTIFACT_LABELS[artifactType],
          value: artifactType,
        })),
      });
      if (!artifactTypesToDownload || artifactTypesToDownload.length === 0) {
        consola.error('You must select at least one artifact type to download.');
        process.exit(1);
      }
    }

    for (const artifactType of artifactTypesToDownload) {
      const option = options[artifactType];
      await handleAppBuildArtifactDownload({
        appId,
        buildId,
        buildArtifacts: build.appBuildArtifacts,
        artifactType,
        formFactor: options.formFactor,
        filePath: typeof option === 'string' ? option : undefined,
      });
    }
  }),
});
