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
    // Strip external file attributes from every entry. `addLocalFolder` copies
    // the source's Unix mode bits onto each entry, so a directory with e.g.
    // `0500` on a CI checkout ends up in the bundle and makes `zip4j` on
    // Android fail with "Could not create directory" when extracting children
    // into that read-only parent. Clearing attrs lets the extractor fall back
    // to its OS defaults. Mirrors the plugin-side workaround in live-update
    // 8.2.1+ (`FileHeader.setExternalFileAttributes(null)`).
    for (const entry of zip.getEntries()) {
      entry.attr = 0;
    }
    return zip.toBuffer();
  }

  async zipFolderWithGitignore(sourceFolder: string): Promise<Buffer> {
    // Do NOT apply the `entry.attr = 0` workaround from `zipFolder` here.
    // This method zips full project sources for server-side builds (callers:
    // `apps:builds:create`, `apps:liveupdates:create`), which include
    // executables like `gradlew` whose `0755` mode must survive the round-trip
    // so the build runner can execute them.
    const files = await globby(['**/*'], {
      cwd: sourceFolder,
      gitignore: true,
      ignore: [
        '.git/**',
        '**/node_modules/**',
        '**/ios/DerivedData/**',
        '**/ios/Pods/**',
        '**/ios/build/**',
        '**/android/build/**',
        '**/android/.gradle/**',
        '**/android/app/build/**',
      ],
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
