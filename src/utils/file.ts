import fs from 'fs';
import mime from 'mime';
import pathModule from 'path';

export const getFilesInDirectoryAndSubdirectories = async (
  path: string,
): Promise<{ href: string; mimeType: string; name: string; path: string }[]> => {
  const files: { href: string; mimeType: string; name: string; path: string }[] = [];
  const walk = async (directory: string) => {
    const dirEntries = await fs.promises.readdir(directory, { withFileTypes: true }).catch(() => []);
    for (const dirEntry of dirEntries) {
      const fullPath = pathModule.join(directory, dirEntry.name);
      if (dirEntry.isDirectory()) {
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

export const fileExistsAtPath = async (path: string): Promise<boolean> => {
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
