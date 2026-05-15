export type FingerprintPlatform = 'android' | 'ios';

export type FingerprintAppType = 'capacitor';

export const FINGERPRINT_VERSION = 1;

export const FINGERPRINT_HASH_ALGORITHM = 'sha256';

export interface FingerprintSource {
  /**
   * The file path relative to the project root.
   *
   * @example 'android/app/build.gradle'
   */
  path: string;
  /**
   * The SHA-256 hash of the file contents.
   */
  hash: string;
}

export interface Fingerprint {
  version: typeof FINGERPRINT_VERSION;
  appType: FingerprintAppType;
  platform: FingerprintPlatform;
  hash: string;
  hashAlgorithm: typeof FINGERPRINT_HASH_ALGORITHM;
  createdAt: string;
  sources: FingerprintSource[];
}

export type FingerprintDiffOperation = 'added' | 'removed' | 'changed';

export interface FingerprintDiffItem {
  op: FingerprintDiffOperation;
  path: string;
}

export interface AppTypeAdapter {
  readonly name: FingerprintAppType;
  /**
   * Returns `true` if this app type is present at the given project root.
   */
  detect(projectRoot: string): Promise<boolean>;
  /**
   * Resolves the absolute path to the native platform directory.
   */
  resolvePlatformDir(projectRoot: string, platform: FingerprintPlatform): Promise<string>;
  /**
   * Returns absolute paths to additional files that should be included in the fingerprint
   * beyond the platform directory and the standard package.json/lockfile.
   */
  getAdditionalSources(projectRoot: string): Promise<string[]>;
}
