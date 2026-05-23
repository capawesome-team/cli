const CHUNK_SIZE = 64 * 1024 * 1024;

export const createHash = async (data: Buffer): Promise<string> => {
  const crypto = await import('crypto');
  const hash = crypto.createHash('sha256');
  for (let offset = 0; offset < data.length; offset += CHUNK_SIZE) {
    hash.update(data.subarray(offset, offset + CHUNK_SIZE));
  }
  return hash.digest('hex');
};
