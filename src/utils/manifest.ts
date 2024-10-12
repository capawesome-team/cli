import { MANIFEST_JSON_FILE_NAME } from '../config';
import { createBufferFromPath } from './buffer';
import { getFilesInDirectoryAndSubdirectories, writeFile } from './file';
import { createHash } from './hash';

export const generateManifestJson = async (path: string) => {
  const manifestItems: ManifestItem[] = [];
  // Get all files
  const files = await getFilesInDirectoryAndSubdirectories(path);
  // Iterate over each file
  for (const [index, file] of files.entries()) {
    const fileBuffer = await createBufferFromPath(file.path);
    const checksum = await createHash(fileBuffer);
    const sizeInBytes = fileBuffer.byteLength;
    manifestItems.push({
      checksum,
      href: file.path.replace(path + '/', ''),
      sizeInBytes,
    });
  }
  // Write the manifest file
  writeFile(`${path}/${MANIFEST_JSON_FILE_NAME}`, JSON.stringify(manifestItems, null, 2));
};

interface ManifestItem {
  checksum: string;
  /**
   * @example 'assets/icons/favicon.ico'
   * @example 'main.38a97264.js'
   */
  href: string;
  /**
   * @example 4826
   */
  sizeInBytes: number;
}