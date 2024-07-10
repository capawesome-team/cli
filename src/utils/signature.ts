export const createSignature = async (privateKey: Buffer, data: Buffer): Promise<string> => {
  const crypto = await import('crypto');
  const sign = crypto.createSign('sha256');
  sign.update(data);
  sign.end();
  return sign.sign(privateKey).toString('base64');
};
