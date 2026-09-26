import appBuildsService from '@/services/app-builds.js';
import { AppBuildArtifactDto, AppBuildDto } from '@/types/app-build.js';
import consola from 'consola';
import fs from 'fs/promises';
import path from 'path';

export type AppBuildArtifactType = AppBuildArtifactDto['type'];

export const APP_BUILD_ARTIFACT_TYPES_BY_PLATFORM: Record<AppBuildDto['platform'], AppBuildArtifactType[]> = {
  android: ['apk', 'aab'],
  ios: ['ipa', 'app'],
  web: ['zip'],
};

export const APP_BUILD_ARTIFACT_LABELS: Record<AppBuildArtifactType, string> = {
  aab: 'AAB',
  apk: 'APK',
  app: 'APP',
  ipa: 'IPA',
  zip: 'ZIP',
};

/**
 * The supported form factors, ordered by selection priority.
 */
export const APP_BUILD_ARTIFACT_FORM_FACTORS = ['mobile', 'watch', 'tv', 'automotive'] as const;

export type AppBuildArtifactFormFactor = (typeof APP_BUILD_ARTIFACT_FORM_FACTORS)[number];

/**
 * Download the build artifact of the given type and report the outcome to the user.
 *
 * Skips the download with a warning if no matching artifact exists or it is not ready yet.
 */
export const handleAppBuildArtifactDownload = async (options: {
  appId: string;
  buildId: string;
  buildArtifacts: AppBuildArtifactDto[] | undefined;
  artifactType: AppBuildArtifactType;
  formFactor?: AppBuildArtifactFormFactor;
  filePath?: string;
}): Promise<void> => {
  const { appId, buildId, buildArtifacts, artifactType, formFactor, filePath } = options;
  const artifactLabel = APP_BUILD_ARTIFACT_LABELS[artifactType];

  try {
    consola.start(`Downloading ${artifactLabel}...`);

    const artifact = findAppBuildArtifact(buildArtifacts, { type: artifactType, formFactor });
    if (!artifact) {
      consola.warn(
        formFactor
          ? `No ${artifactLabel} artifact with form factor "${formFactor}" found for this build.`
          : `No ${artifactLabel} artifact found for this build.`,
      );
      return;
    }
    if (artifact.status !== 'ready') {
      consola.warn(`${artifactLabel} artifact is not ready (status: ${artifact.status}).`);
      return;
    }

    const outputPath = await downloadAppBuildArtifact({ appId, buildId, artifact, filePath });

    consola.success(`${artifactLabel} downloaded successfully: ${outputPath}`);
  } catch (error) {
    consola.error(`Failed to download ${artifactLabel}:`, error);
  }
};

/**
 * Find a build artifact by its type and, optionally, its form factor.
 *
 * Without a form factor, the first artifact in the order of `APP_BUILD_ARTIFACT_FORM_FACTORS` is returned.
 */
export const findAppBuildArtifact = (
  artifacts: AppBuildArtifactDto[] | undefined,
  options: { type: AppBuildArtifactType; formFactor?: AppBuildArtifactFormFactor },
): AppBuildArtifactDto | undefined => {
  const artifactsOfType = artifacts?.filter((artifact) => artifact.type === options.type) ?? [];
  const formFactors = options.formFactor ? [options.formFactor] : APP_BUILD_ARTIFACT_FORM_FACTORS;
  for (const formFactor of formFactors) {
    const artifact = artifactsOfType.find((artifact) => artifact.formFactor === formFactor);
    if (artifact) {
      return artifact;
    }
  }
  return undefined;
};

/**
 * Build the default file name for a build artifact.
 */
export const getAppBuildArtifactFileName = (buildId: string, artifact: AppBuildArtifactDto): string => {
  const formFactorSuffix = artifact.formFactor === 'mobile' ? '' : `-${artifact.formFactor}`;
  return `${buildId}${formFactorSuffix}.${getFileExtension(artifact.type)}`;
};

/**
 * Download a build artifact to disk and return the output path.
 */
export const downloadAppBuildArtifact = async (options: {
  appId: string;
  buildId: string;
  artifact: AppBuildArtifactDto;
  filePath?: string;
}): Promise<string> => {
  const { appId, buildId, artifact, filePath } = options;

  const artifactData = await appBuildsService.downloadArtifact({
    appId,
    appBuildId: buildId,
    artifactId: artifact.id,
  });
  const outputPath = path.resolve(filePath || getAppBuildArtifactFileName(buildId, artifact));
  await fs.writeFile(outputPath, Buffer.from(artifactData));

  return outputPath;
};

// The app artifact is a zipped `.app` bundle
const getFileExtension = (artifactType: AppBuildArtifactType): string =>
  artifactType === 'app' ? 'app.zip' : artifactType;
