import { createBufferFromPath } from '@/utils/buffer.js';
import { UserError } from '@/utils/error.js';
import { pathExists, isDirectory } from '@/utils/file.js';
import { createHash } from '@/utils/hash.js';
import pathModule from 'path';
import { detectAppType } from './app-types.js';
import {
  FINGERPRINT_HASH_ALGORITHM,
  FINGERPRINT_VERSION,
  type Fingerprint,
  type FingerprintDiffItem,
  type FingerprintPlatform,
  type FingerprintSource,
} from './types.js';
import { walkDirectory } from './walker.js';

const LOCK_FILES = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb'];

const findLockFile = async (projectRoot: string): Promise<string | undefined> => {
  for (const fileName of LOCK_FILES) {
    const absolutePath = pathModule.join(projectRoot, fileName);
    if (await pathExists(absolutePath)) {
      return absolutePath;
    }
  }
  return undefined;
};

const toRelativePath = (projectRoot: string, absolutePath: string): string => {
  const relative = pathModule.relative(projectRoot, absolutePath);
  return relative.split(pathModule.sep).join('/');
};

export const createFingerprint = async (options: {
  projectRoot: string;
  platform: FingerprintPlatform;
}): Promise<Fingerprint> => {
  const { projectRoot, platform } = options;

  const projectRootExists = await pathExists(projectRoot);
  if (!projectRootExists) {
    throw new UserError(`The given path does not exist: ${projectRoot}`);
  }
  const projectRootIsDirectory = await isDirectory(projectRoot);
  if (!projectRootIsDirectory) {
    throw new UserError(`The given path is not a directory: ${projectRoot}`);
  }

  const appType = await detectAppType(projectRoot);

  const platformDir = await appType.resolvePlatformDir(projectRoot, platform);
  const platformDirExists = await pathExists(platformDir);
  if (!platformDirExists) {
    throw new UserError(`The ${platform} project directory was not found at: ${platformDir}`);
  }
  const platformDirIsDirectory = await isDirectory(platformDir);
  if (!platformDirIsDirectory) {
    throw new UserError(`The ${platform} project path is not a directory: ${platformDir}`);
  }

  const absolutePaths = new Set<string>();
  for (const file of await walkDirectory(platformDir)) {
    absolutePaths.add(file);
  }

  const additionalSources = await appType.getAdditionalSources(projectRoot);
  for (const source of additionalSources) {
    if (await pathExists(source)) {
      absolutePaths.add(source);
    }
  }

  const packageJsonPath = pathModule.join(projectRoot, 'package.json');
  if (await pathExists(packageJsonPath)) {
    absolutePaths.add(packageJsonPath);
  }
  const lockFilePath = await findLockFile(projectRoot);
  if (lockFilePath) {
    absolutePaths.add(lockFilePath);
  }

  const sources: FingerprintSource[] = [];
  for (const absolutePath of absolutePaths) {
    const buffer = await createBufferFromPath(absolutePath);
    const hash = await createHash(buffer);
    sources.push({
      path: toRelativePath(projectRoot, absolutePath),
      hash,
    });
  }
  sources.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

  const finalHash = await createHash(Buffer.from(JSON.stringify(sources)));

  return {
    version: FINGERPRINT_VERSION,
    appType: appType.name,
    platform,
    hash: finalHash,
    hashAlgorithm: FINGERPRINT_HASH_ALGORITHM,
    createdAt: new Date().toISOString(),
    sources,
  };
};

export const diffFingerprints = (from: Fingerprint, to: Fingerprint): FingerprintDiffItem[] => {
  if (from.appType !== to.appType) {
    throw new UserError(`Cannot compare fingerprints with different app types: "${from.appType}" and "${to.appType}".`);
  }
  if (from.platform !== to.platform) {
    throw new UserError(
      `Cannot compare fingerprints with different platforms: "${from.platform}" and "${to.platform}".`,
    );
  }

  const fromByPath = new Map(from.sources.map((source) => [source.path, source.hash]));
  const toByPath = new Map(to.sources.map((source) => [source.path, source.hash]));
  const allPaths = new Set<string>([...fromByPath.keys(), ...toByPath.keys()]);

  const items: FingerprintDiffItem[] = [];
  for (const path of allPaths) {
    const fromHash = fromByPath.get(path);
    const toHash = toByPath.get(path);
    if (fromHash === undefined && toHash !== undefined) {
      items.push({ op: 'added', path });
    } else if (fromHash !== undefined && toHash === undefined) {
      items.push({ op: 'removed', path });
    } else if (fromHash !== toHash) {
      items.push({ op: 'changed', path });
    }
  }
  items.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return items;
};

export * from './types.js';
