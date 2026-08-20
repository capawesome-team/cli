import fs from 'fs';
import mime from 'mime';
import pathModule from 'path';
import { createBufferFromPath } from './buffer.js';
import { getCodeFromUnknownError, UserError } from './error.js';

const unreadableFileErrorCodes = ['EACCES', 'EBUSY', 'ENOENT', 'EPERM'];

export const getFilesInDirectoryAndSubdirectories = async (
  path: string,
): Promise<{ href: string; mimeType: string; name: string; path: string }[]> => {
  const files: { href: string; mimeType: string; name: string; path: string }[] = [];
  const walk = async (directory: string) => {
    const dirEntries = await fs.promises.readdir(directory, { withFileTypes: true }).catch(() => []);
    for (const dirEntry of dirEntries) {
      const fullPath = pathModule.join(directory, dirEntry.name);
      if (dirEntry.isSymbolicLink()) {
        // Skip symlinks
      } else if (dirEntry.isDirectory()) {
        await walk(fullPath);
      } else {
        let pathToReplace = pathModule.normalize(path);
        // Remove the leading './' from the path
        if (pathToReplace.startsWith('./')) {
          pathToReplace = pathToReplace.replace('./', '');
        }
        let href = fullPath.replace(pathToReplace, '');
        // Replace the backslashes with forward slashes (Windows only)
        href = href.replace(/\\/g, '/');
        // Remove the leading '/' from the href
        if (href.startsWith('/')) {
          href = href.replace('/', '');
        }
        files.push({
          href,
          mimeType: mime.getType(dirEntry.name) || 'application/octet-stream',
          name: dirEntry.name,
          path: fullPath,
        });
      }
    }
  };
  await walk(path);
  return files;
};

/**
 * Reads a file that was found by `getFilesInDirectoryAndSubdirectories`.
 * Such files can vanish or get locked in the meantime (e.g. by a running build or a file sync client).
 */
export const readFileFromDirectory = async (path: string): Promise<Buffer> => {
  try {
    return await createBufferFromPath(path);
  } catch (error) {
    const code = getCodeFromUnknownError(error);
    if (code && unreadableFileErrorCodes.includes(code)) {
      throw new UserError(
        `The file could not be read: ${path}. Make sure that no other process (e.g. a build or file sync client) modifies the folder while the command is running.`,
      );
    }
    throw error;
  }
};

export const directoryContainsSymlinks = async (path: string): Promise<boolean> => {
  const dirEntries = await fs.promises.readdir(path, { withFileTypes: true, recursive: true }).catch(() => []);
  return dirEntries.some((dirEntry) => dirEntry.isSymbolicLink());
};

export const directoryContainsSourceMaps = async (path: string): Promise<boolean> => {
  const files = await getFilesInDirectoryAndSubdirectories(path);
  return files.some((file) => file.name.endsWith('.js.map') || file.name.endsWith('.css.map'));
};

export const isReadable = async (path: string): Promise<boolean> => {
  return new Promise((resolve) => {
    fs.access(path, fs.constants.R_OK, (err) => {
      resolve(!err);
    });
  });
};

export const pathExists = async (path: string): Promise<boolean> => {
  return new Promise((resolve) => {
    fs.access(path, fs.constants.F_OK, (err) => {
      resolve(!err);
    });
  });
};

export const isDirectory = async (path: string): Promise<boolean> => {
  return new Promise((resolve) => {
    fs.lstat(path, (err, stats) => {
      resolve(stats.isDirectory());
    });
  });
};

export const writeFile = async (path: string, data: string) => {
  return new Promise((resolve, reject) => {
    fs.writeFile(path, data, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(undefined);
      }
    });
  });
};
