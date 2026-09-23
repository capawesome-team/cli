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
 * Download a build artifact into the current working directory or to the given file path.
 */
export const downloadAppBuildArtifact = async (options: {
  appId: string;
  buildId: string;
  buildArtifacts: AppBuildArtifactDto[] | undefined;
  artifactType: AppBuildArtifactType;
  filePath?: string;
}): Promise<void> => {
  const { appId, buildId, buildArtifacts, artifactType, filePath } = options;
  const artifactLabel = APP_BUILD_ARTIFACT_LABELS[artifactType];

  try {
    consola.start(`Downloading ${artifactLabel}...`);

    const artifact = buildArtifacts?.find((artifact) => artifact.type === artifactType);
    if (!artifact) {
      consola.warn(`No ${artifactLabel} artifact found for this build.`);
      return;
    }
    if (artifact.status !== 'ready') {
      consola.warn(`${artifactLabel} artifact is not ready (status: ${artifact.status}).`);
      return;
    }

    const artifactData = await appBuildsService.downloadArtifact({
      appId,
      appBuildId: buildId,
      artifactId: artifact.id,
    });

    const outputPath = path.resolve(filePath ?? `${buildId}.${getFileExtension(artifactType)}`);
    await fs.writeFile(outputPath, Buffer.from(artifactData));

    consola.success(`${artifactLabel} downloaded successfully: ${outputPath}`);
  } catch (error) {
    consola.error(`Failed to download ${artifactLabel}:`, error);
  }
};

// The app artifact is a zipped `.app` bundle
const getFileExtension = (artifactType: AppBuildArtifactType): string =>
  artifactType === 'app' ? 'app.zip' : artifactType;
