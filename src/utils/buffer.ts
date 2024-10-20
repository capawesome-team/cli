import { ReadStream } from 'fs';

export const createBufferFromBlob = async (blob: Blob): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(Buffer.from(reader.result));
      } else {
        reject(new Error('Failed to convert Blob to Buffer.'));
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(blob);
  });
};

export const createBufferFromPath = async (path: string): Promise<Buffer> => {
  const fs = await import('fs');
  const stream = fs.createReadStream(path);
  return createBufferFromReadStream(stream);
};

export const createBufferFromReadStream = async (data: ReadStream): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    data.on('readable', () => {
      let chunk;
      while ((chunk = data.read())) {
        chunks.push(chunk);
      }
    });
    data.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
    data.on('error', reject);
  });
};
