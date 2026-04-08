import { UserError } from '@/utils/error.js';
import AdmZip from 'adm-zip';
import { globby } from 'globby';
import path from 'path';

const MAX_ZIP_ENTRIES = 65535;

interface Zip {
  zipFolder(sourceFolder: string): Promise<Buffer>;
  zipFolderWithGitignore(sourceFolder: string): Promise<Buffer>;
  isZipped(path: string): boolean;
}

class ZipImpl implements Zip {
  async zipFolder(sourceFolder: string): Promise<Buffer> {
    const zip = new AdmZip();
    zip.addLocalFolder(sourceFolder);
    return zip.toBuffer();
  }

  async zipFolderWithGitignore(sourceFolder: string): Promise<Buffer> {
    const files = await globby(['**/*'], {
      cwd: sourceFolder,
      gitignore: true,
      ignore: ['.git/**'],
      dot: true,
    });
    if (files.length > MAX_ZIP_ENTRIES) {
      throw new UserError(
        `The source folder contains ${files.length} files, which exceeds the ZIP limit of ${MAX_ZIP_ENTRIES} entries. ` +
          `Make sure your .gitignore excludes large directories such as node_modules.`,
      );
    }
    const zip = new AdmZip();
    for (const file of files) {
      const filePath = path.join(sourceFolder, file);
      const dirName = path.dirname(file);
      zip.addLocalFile(filePath, dirName === '.' ? '' : dirName);
    }
    return zip.toBuffer();
  }

  isZipped(filePath: string): boolean {
    return filePath.endsWith('.zip');
  }
}

const zip: Zip = new ZipImpl();

export default zip;
