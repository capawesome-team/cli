import { exec } from 'child_process';
import fs from 'fs';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Check if OpenSSL is installed on the system.
 *
 * @returns True if OpenSSL is installed, false otherwise.
 */
export const checkOpensslInstalled = async (): Promise<boolean> => {
  try {
    await execAsync('openssl version');
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Generate an RSA key pair using OpenSSL.
 *
 * @param privateKeyPath Path where the private key will be saved.
 * @param publicKeyPath Path where the public key will be saved.
 */
export const generateKeyPair = async (privateKeyPath: string, publicKeyPath: string): Promise<void> => {
  // Generate private key
  await execAsync(`openssl genrsa -out ${privateKeyPath} 2048`);

  // Extract public key from private key
  await execAsync(`openssl rsa -in ${privateKeyPath} -pubout -out ${publicKeyPath}`);
};

/**
 * Read a public key from a file.
 *
 * @param publicKeyPath Path to the public key file.
 * @returns The public key content as a string.
 */
export const readPublicKey = async (publicKeyPath: string): Promise<string> => {
  const content = await fs.promises.readFile(publicKeyPath, 'utf-8');
  return content.trim();
};
