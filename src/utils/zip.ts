import AdmZip from 'adm-zip';
import { globby } from 'globby';
import path from 'path';

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
