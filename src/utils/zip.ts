import AdmZip from 'adm-zip';

interface Zip {
  zipFolder(sourceFolder: string): Promise<Buffer>;
  isZipped(path: string): boolean;
}

class ZipImpl implements Zip {
  async zipFolder(sourceFolder: string): Promise<Buffer> {
    const zip = new AdmZip();
    zip.addLocalFolder(sourceFolder);
    return zip.toBuffer();
  }

  isZipped(path: string): boolean {
    return path.endsWith('.zip');
  }
}

const zip: Zip = new ZipImpl();

export default zip;
