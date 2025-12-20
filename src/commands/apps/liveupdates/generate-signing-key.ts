import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { promises as fs } from 'fs';
import pathModule from 'path';
import { z } from 'zod';

export default defineCommand({
  description: 'Generate a new code signing key pair for Live Updates.',
  options: defineOptions(
    z.object({
      publicKeyPath: z
        .string()
        .optional()
        .describe('Path where the public key should be saved. Defaults to "public.pem".'),
      privateKeyPath: z
        .string()
        .optional()
        .describe('Path where the private key should be saved. Defaults to "private.pem".'),
      keySize: z.coerce
        .number()
        .optional()
        .default(2048)
        .refine((val) => [2048, 3072, 4096].includes(val), {
          message: 'Key size must be 2048, 3072, or 4096 bits.',
        })
        .describe('The RSA key size in bits. Must be 2048, 3072, or 4096. Defaults to 2048.'),
    }),
  ),
  action: async (options, _args) => {
    const { publicKeyPath = 'public.pem', privateKeyPath = 'private.pem', keySize = 2048 } = options;

    try {
      consola.start(`Generating ${keySize}-bit RSA key pair...`);

      // Generate RSA key pair using Node.js crypto module
      const crypto = await import('crypto');
      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: keySize,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem',
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem',
        },
      });

      // Resolve absolute paths
      const absolutePublicKeyPath = pathModule.resolve(process.cwd(), publicKeyPath);
      const absolutePrivateKeyPath = pathModule.resolve(process.cwd(), privateKeyPath);

      // Write the keys to files
      await fs.writeFile(absolutePublicKeyPath, publicKey, 'utf8');
      await fs.writeFile(absolutePrivateKeyPath, privateKey, 'utf8');

      consola.log('');
      consola.log('Public key saved to:  ' + absolutePublicKeyPath);
      consola.log('Private key saved to: ' + absolutePrivateKeyPath);
      consola.log('');
      consola.warn('IMPORTANT: Keep your private key safe and never commit it to version control!');
      consola.log('');
      consola.log(
        'To configure code signing in the Capacitor Live Update plugin, add the following to your Capacitor Configuration file:',
      );
      consola.log('');

      // Format the public key for JSON output (remove line breaks)
      const publicKeyForJson = publicKey.replace(/\n/g, '');

      // Print the JSON configuration
      const config = {
        plugins: {
          LiveUpdate: {
            publicKey: publicKeyForJson,
          },
        },
      };

      consola.log(JSON.stringify(config, null, 2));
      console.log('');
      consola.success('Code signing key pair generated successfully!');
    } catch (error) {
      consola.error('Failed to generate signing key pair.');
      throw error;
    }
  },
});
