const CHUNK_SIZE = 64 * 1024 * 1024;

export const createSignature = async (privateKey: Buffer, data: Buffer): Promise<string> => {
  const crypto = await import('crypto');
  const privateKeyObject = crypto.createPrivateKey(privateKey);
  const sign = crypto.createSign('sha256');
  for (let offset = 0; offset < data.length; offset += CHUNK_SIZE) {
    sign.update(data.subarray(offset, offset + CHUNK_SIZE));
  }
  sign.end();
  return sign.sign(privateKeyObject).toString('base64');
};
