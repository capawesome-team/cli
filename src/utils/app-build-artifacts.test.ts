import { describe, expect, it } from 'vitest';
import { AppBuildArtifactDto } from '@/types/app-build.js';
import { findAppBuildArtifact, getAppBuildArtifactFileName } from './app-build-artifacts.js';

const createArtifact = (artifact: Partial<AppBuildArtifactDto>): AppBuildArtifactDto => ({
  id: 'artifact-id',
  fileMimeType: 'application/octet-stream',
  fileName: 'app.aab',
  fileSizeInBytes: 1,
  status: 'ready',
  type: 'aab',
  ...artifact,
});

describe('findAppBuildArtifact', () => {
  it('should treat an artifact without a form factor as mobile', () => {
    const artifact = createArtifact({ id: 'legacy', formFactor: null });

    expect(findAppBuildArtifact([artifact], { type: 'aab', formFactor: 'mobile' })).toBe(artifact);
  });

  it('should return the artifacts in the selection order', () => {
    const watchArtifact = createArtifact({ id: 'watch', formFactor: 'watch' });
    const mobileArtifact = createArtifact({ id: 'mobile', formFactor: 'mobile' });

    expect(findAppBuildArtifact([watchArtifact, mobileArtifact], { type: 'aab' })).toBe(mobileArtifact);
  });

  it('should fall back to the next form factor if no mobile artifact exists', () => {
    const automotiveArtifact = createArtifact({ id: 'automotive', formFactor: 'automotive' });
    const tvArtifact = createArtifact({ id: 'tv', formFactor: 'tv' });

    expect(findAppBuildArtifact([automotiveArtifact, tvArtifact], { type: 'aab' })).toBe(tvArtifact);
  });

  it('should return the artifact with the requested form factor', () => {
    const mobileArtifact = createArtifact({ id: 'mobile', formFactor: 'mobile' });
    const watchArtifact = createArtifact({ id: 'watch', formFactor: 'watch' });

    expect(findAppBuildArtifact([mobileArtifact, watchArtifact], { type: 'aab', formFactor: 'watch' })).toBe(
      watchArtifact,
    );
  });

  it('should return undefined if no artifact matches the requested form factor', () => {
    const mobileArtifact = createArtifact({ formFactor: 'mobile' });

    expect(findAppBuildArtifact([mobileArtifact], { type: 'aab', formFactor: 'tv' })).toBeUndefined();
  });

  it('should ignore artifacts of another type', () => {
    const apkArtifact = createArtifact({ id: 'apk', type: 'apk' });
    const aabArtifact = createArtifact({ id: 'aab', type: 'aab' });

    expect(findAppBuildArtifact([apkArtifact, aabArtifact], { type: 'apk' })).toBe(apkArtifact);
  });

  it('should return undefined if no artifacts are given', () => {
    expect(findAppBuildArtifact(undefined, { type: 'aab' })).toBeUndefined();
  });
});

describe('getAppBuildArtifactFileName', () => {
  it('should not add a suffix for a mobile artifact', () => {
    const artifact = createArtifact({ formFactor: 'mobile' });

    expect(getAppBuildArtifactFileName('build-id', artifact)).toBe('build-id.aab');
  });

  it('should not add a suffix for an artifact without a form factor', () => {
    const artifact = createArtifact({ formFactor: null });

    expect(getAppBuildArtifactFileName('build-id', artifact)).toBe('build-id.aab');
  });

  it('should add the form factor as a suffix for a watch artifact', () => {
    const artifact = createArtifact({ formFactor: 'watch' });

    expect(getAppBuildArtifactFileName('build-id', artifact)).toBe('build-id-watch.aab');
  });
});
