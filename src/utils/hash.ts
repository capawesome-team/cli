export const createHash = async (data: Buffer): Promise<string> => {
  const crypto = await import('crypto');
  return crypto.createHash('sha256').update(data).digest('hex');
};
