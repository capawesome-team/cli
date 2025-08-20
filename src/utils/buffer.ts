import { ReadStream } from 'fs';

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

export const createBufferFromString = (content: string): Buffer => {
  return Buffer.from(content, 'utf8');
};

export const isPrivateKeyContent = (input: string): boolean => {
  return input.includes('-----BEGIN') && input.includes('PRIVATE KEY-----');
};

