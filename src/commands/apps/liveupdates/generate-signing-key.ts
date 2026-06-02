import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { promises as fs } from 'fs';
import pathModule from 'path';
import { z } from 'zod';
import { isInteractive } from '@/utils/environment.js';
import { prompt } from '@/utils/prompt.js';

const APP_TYPES = ['capacitor', 'cordova'] as const;
type SigningKeyAppType = (typeof APP_TYPES)[number];

export default defineCommand({
  description: 'Generate a new code signing key pair for Live Updates.',
  options: defineOptions(
    z.object({
      appType: z
        .enum(APP_TYPES)
        .optional()
        .describe('The app type to configure code signing for. Either `capacitor` or `cordova`.'),
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

      // Ensure parent directories exist
      await fs.mkdir(pathModule.dirname(absolutePublicKeyPath), { recursive: true });
      await fs.mkdir(pathModule.dirname(absolutePrivateKeyPath), { recursive: true });

      // Write the keys to files
      await fs.writeFile(absolutePublicKeyPath, publicKey, 'utf8');
      await fs.writeFile(absolutePrivateKeyPath, privateKey, 'utf8');

      consola.log('');
      consola.log('Public key saved to:  ' + absolutePublicKeyPath);
      consola.log('Private key saved to: ' + absolutePrivateKeyPath);
      consola.log('');
      consola.warn('IMPORTANT: Keep your private key safe and never commit it to version control!');

      const appType = await resolveAppType(options.appType);
      if (appType) {
        // Format the public key for JSON output (remove line breaks)
        const publicKeyForJson = publicKey.replace(/\n/g, '');
        consola.log('');
        printSigningKeyConfig(appType, publicKeyForJson);
      }

      consola.log('');
      consola.success('Code signing key pair generated successfully!');
    } catch (error) {
      consola.error('Failed to generate signing key pair.');
      throw error;
    }
  },
});

const resolveAppType = async (appType?: SigningKeyAppType): Promise<SigningKeyAppType | undefined> => {
  if (appType) {
    return appType;
  }
  if (!isInteractive()) {
    return undefined;
  }
  // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
  return prompt('Which app type do you want to configure code signing for?', {
    type: 'select',
    options: [
      { label: 'Capacitor', value: 'capacitor' },
      { label: 'Cordova', value: 'cordova' },
    ],
  });
};

const printSigningKeyConfig = (appType: SigningKeyAppType, publicKey: string): void => {
  if (appType === 'cordova') {
    const config = {
      cordova: {
        plugins: {
          '@capawesome/cordova-live-update': {
            PUBLIC_KEY: publicKey,
          },
        },
      },
    };
    consola.log(
      'To configure code signing in the Cordova Live Update plugin, add the following to your `package.json` file:',
    );
    consola.log('');
    consola.log(JSON.stringify(config, null, 2));
    consola.log('');
    consola.warn('If the plugin has already been added, you must re-add it for the changes to take effect.');
    return;
  }

  const config = {
    plugins: {
      LiveUpdate: {
        publicKey,
      },
    },
  };
  consola.log(
    'To configure code signing in the Capacitor Live Update plugin, add the following to your Capacitor configuration file:',
  );
  consola.log('');
  consola.log(JSON.stringify(config, null, 2));
};
