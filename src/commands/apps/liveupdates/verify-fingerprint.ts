import { UserError } from '@/utils/error.js';
import { pathExists } from '@/utils/file.js';
import { createFingerprint, type Fingerprint } from '@/utils/fingerprint/index.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { promises as fs } from 'fs';
import pathModule from 'path';
import { z } from 'zod';

export default defineCommand({
  description: '[Experimental] Verify that the current project state matches a previously generated fingerprint.',
  options: defineOptions(
    z.object({
      platform: z.enum(['android', 'ios']).describe('The native platform of the fingerprint to verify against.'),
      path: z.string().optional().default('.').describe('Path to the project root directory. Defaults to `.`.'),
      fingerprintPath: z.string().optional().describe('Path to a fingerprint JSON file to verify against.'),
      fingerprintHash: z.string().optional().describe('Hash string to verify against.'),
    }),
  ),
  action: async (options, _args) => {
    const { platform, path, fingerprintPath, fingerprintHash } = options;

    consola.warn('This command is experimental and may change in the future.');

    if (!fingerprintPath && !fingerprintHash) {
      consola.error('You must provide either `--fingerprint-path` or `--fingerprint-hash`.');
      process.exit(1);
    }
    if (fingerprintPath && fingerprintHash) {
      consola.error('You can only provide one of `--fingerprint-path` or `--fingerprint-hash`.');
      process.exit(1);
    }

    let expectedHash: string;
    if (fingerprintPath) {
      const absolutePath = pathModule.resolve(process.cwd(), fingerprintPath);
      if (!(await pathExists(absolutePath))) {
        consola.error(`The fingerprint file does not exist: ${absolutePath}`);
        process.exit(1);
      }
      const content = await fs.readFile(absolutePath, 'utf8');
      let fingerprint: Fingerprint;
      try {
        fingerprint = JSON.parse(content) as Fingerprint;
      } catch {
        throw new UserError(`The fingerprint file is not a valid JSON file: ${absolutePath}`);
      }
      if (fingerprint.platform !== platform) {
        consola.error(
          `The fingerprint file is for platform "${fingerprint.platform}" but "${platform}" was requested.`,
        );
        process.exit(1);
      }
      expectedHash = fingerprint.hash;
    } else {
      expectedHash = fingerprintHash as string;
    }

    const projectRoot = pathModule.resolve(process.cwd(), path);
    const current = await createFingerprint({ projectRoot, platform });

    if (current.hash === expectedHash) {
      consola.success('Fingerprint matches.');
      process.exit(0);
    } else {
      consola.error(
        'Fingerprint does not match. Run `apps:liveupdates:comparefingerprints` to get a list of changed files.',
      );
      process.exit(1);
    }
  },
});
