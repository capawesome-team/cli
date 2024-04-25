import archiver from 'archiver'

interface Zip {
  zipFolder(sourceFolder: string): Promise<Buffer>
  isZipped(path: string): boolean
}

class ZipImpl implements Zip {
  async zipFolder(sourceFolder: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 9 } });
      const buffers: any[] = [];

      archive.on('data', data => buffers.push(data));
      archive.on('error', err => reject(err));
      archive.on('end', () => resolve(Buffer.concat(buffers)));

      archive.directory(sourceFolder, false);
      archive.finalize();
    });
  }

  isZipped(path: string): boolean {
    return path.endsWith('.zip')
  }
}

const zip: Zip = new ZipImpl()

export default zip
