export const fileExistsAtPath = async (path: string): Promise<boolean> => {
  const fs = await import('fs');
  return new Promise((resolve) => {
    fs.access(path, fs.constants.F_OK, (err) => {
      resolve(!err);
    });
  });
};
