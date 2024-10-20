export const getFilesInDirectoryAndSubdirectories = async (path: string): Promise<{ path: string; name: string }[]> => {
  const fs = await import('fs');
  const pathModule = await import('path');
  const files: { path: string; name: string }[] = [];
  const walk = async (directory: string) => {
    const dirEntries = await fs.promises.readdir(directory, { withFileTypes: true }).catch(() => []);
    for (const dirEntry of dirEntries) {
      const fullPath = pathModule.join(directory, dirEntry.name);
      if (dirEntry.isDirectory()) {
        await walk(fullPath);
      } else {
        files.push({
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
  const fs = await import('fs');
  return new Promise((resolve) => {
    fs.access(path, fs.constants.F_OK, (err) => {
      resolve(!err);
    });
  });
};

export const isDirectory = async (path: string): Promise<boolean> => {
  const fs = await import('fs');
  return new Promise((resolve) => {
    fs.lstat(path, (err, stats) => {
      resolve(stats.isDirectory());
    });
  });
};

export const writeFile = async (path: string, data: string) => {
  const fs = await import('fs');
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
