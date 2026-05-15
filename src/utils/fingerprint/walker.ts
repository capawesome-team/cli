import fs from 'fs';
import { globby } from 'globby';
import pathModule from 'path';

/**
 * Walks the given directory and returns absolute paths of all files,
 * respecting `.gitignore` rules. Symbolic links and `.gitignore` files are skipped.
 */
export const walkDirectory = async (directory: string): Promise<string[]> => {
  const entries = await globby('**/*', {
    cwd: directory,
    absolute: true,
    dot: true,
    gitignore: true,
    onlyFiles: true,
    followSymbolicLinks: false,
    suppressErrors: true,
  });

  const files: string[] = [];
  for (const entry of entries) {
    const baseName = pathModule.basename(entry);
    if (baseName === '.gitignore') {
      continue;
    }
    try {
      const stats = await fs.promises.lstat(entry);
      if (stats.isSymbolicLink()) {
        continue;
      }
    } catch {
      continue;
    }
    files.push(entry);
  }
  return files;
};
