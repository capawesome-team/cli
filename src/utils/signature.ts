export const createSignature = async (privateKey: Buffer, data: Buffer): Promise<string> => {
  const crypto = await import('crypto');
  let privateKeyObject: ReturnType<typeof crypto.createPrivateKey>;
  try {
    privateKeyObject = crypto.createPrivateKey(privateKey);
  } catch (error) {
    throw new Error(
      'Failed to parse the private key. Make sure the private key is a valid PEM-formatted key and is not encrypted.',
    );
  }
  const sign = crypto.createSign('sha256');
  sign.update(data);
  sign.end();
  return sign.sign(privateKeyObject).toString('base64');
};
