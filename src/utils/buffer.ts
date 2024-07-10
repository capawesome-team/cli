import { ReadStream } from 'fs';

export const createBuffer = async (data: ReadStream): Promise<Buffer> => {
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
