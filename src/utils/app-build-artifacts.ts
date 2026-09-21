import appBuildsService from '@/services/app-builds.js';
import { AppBuildArtifactDto } from '@/types/app-build.js';
import consola from 'consola';
import fs from 'fs/promises';
import path from 'path';

/**
 * The supported form factors, ordered by selection priority.
 */
export const APP_BUILD_ARTIFACT_FORM_FACTORS = ['mobile', 'watch', 'tv', 'automotive'] as const;

export type AppBuildArtifactFormFactor = (typeof APP_BUILD_ARTIFACT_FORM_FACTORS)[number];

/**
 * Find a build artifact by its type and, optionally, its form factor.
 *
 * Without a form factor, the first artifact in the order of `APP_BUILD_ARTIFACT_FORM_FACTORS` is returned.
 */
export const findAppBuildArtifact = (
  artifacts: AppBuildArtifactDto[] | undefined,
  options: { type: AppBuildArtifactDto['type']; formFactor?: AppBuildArtifactFormFactor },
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
export const getAppBuildArtifactFileName = (buildId: string, artifact: AppBuildArtifactDto): string =>
  artifact.formFactor === 'mobile'
    ? `${buildId}.${artifact.type}`
    : `${buildId}-${artifact.formFactor}.${artifact.type}`;

/**
 * Download a build artifact (APK, AAB, IPA, or ZIP).
 */
export const downloadAppBuildArtifact = async (options: {
  appId: string;
  buildId: string;
  artifacts: AppBuildArtifactDto[] | undefined;
  type: 'apk' | 'aab' | 'ipa' | 'zip';
  formFactor?: AppBuildArtifactFormFactor;
  filePath?: string;
}): Promise<void> => {
  const { appId, buildId, artifacts, type, formFactor, filePath } = options;
  const typeInUpperCase = type.toUpperCase();

  try {
    consola.start(`Downloading ${typeInUpperCase}...`);

    const artifact = findAppBuildArtifact(artifacts, { type, formFactor });
    if (!artifact) {
      consola.warn(
        formFactor
          ? `No ${typeInUpperCase} artifact with form factor "${formFactor}" found for this build.`
          : `No ${typeInUpperCase} artifact found for this build.`,
      );
      return;
    }
    if (artifact.status !== 'ready') {
      consola.warn(`${typeInUpperCase} artifact is not ready (status: ${artifact.status}).`);
      return;
    }

    const artifactData = await appBuildsService.downloadArtifact({
      appId,
      appBuildId: buildId,
      artifactId: artifact.id,
    });
    const outputPath = path.resolve(filePath ?? getAppBuildArtifactFileName(buildId, artifact));
    await fs.writeFile(outputPath, Buffer.from(artifactData));

    consola.success(`${typeInUpperCase} downloaded successfully: ${outputPath}`);
  } catch (error) {
    consola.error(`Failed to download ${typeInUpperCase}:`, error);
  }
};
