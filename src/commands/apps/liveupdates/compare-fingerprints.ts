import { UserError } from '@/utils/error.js';
import { pathExists } from '@/utils/file.js';
import { diffFingerprints, type Fingerprint } from '@/utils/fingerprint/index.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { promises as fs } from 'fs';
import pathModule from 'path';
import { z } from 'zod';

const loadFingerprintFile = async (fingerprintPath: string): Promise<Fingerprint> => {
  const absolutePath = pathModule.resolve(process.cwd(), fingerprintPath);
  if (!(await pathExists(absolutePath))) {
    throw new UserError(`The fingerprint file does not exist: ${absolutePath}`);
  }
  const content = await fs.readFile(absolutePath, 'utf8');
  try {
    return JSON.parse(content) as Fingerprint;
  } catch {
    throw new UserError(`The fingerprint file is not a valid JSON file: ${absolutePath}`);
  }
};

const OPERATION_SYMBOLS = {
  added: '+',
  removed: '-',
  changed: '~',
} as const;

export default defineCommand({
  description: '[Experimental] Compare two previously generated fingerprints.',
  options: defineOptions(
    z.object({
      fingerprintPath: z
        .array(z.string())
        .optional()
        .describe('Path to a fingerprint JSON file. Must be specified exactly twice.'),
      json: z.boolean().optional().default(false).describe('Output the diff as JSON.'),
    }),
  ),
  action: async (options, _args) => {
    const { fingerprintPath, json } = options;

    consola.warn('This command is experimental and may change in the future.');

    if (!fingerprintPath || fingerprintPath.length !== 2) {
      consola.error('You must provide exactly two `--fingerprint-path` options.');
      process.exit(1);
    }

    const [fromPath, toPath] = fingerprintPath as [string, string];
    const from = await loadFingerprintFile(fromPath);
    const to = await loadFingerprintFile(toPath);

    const diff = diffFingerprints(from, to);

    if (json) {
      console.log(JSON.stringify(diff, null, 2));
      return;
    }

    if (diff.length === 0) {
      consola.success('Fingerprints match.');
      return;
    }

    let added = 0;
    let removed = 0;
    let changed = 0;
    for (const item of diff) {
      console.log(`${OPERATION_SYMBOLS[item.op]} ${item.path}`);
      if (item.op === 'added') added++;
      else if (item.op === 'removed') removed++;
      else changed++;
    }
    console.log('');
    console.log(`${diff.length} changes (${added} added, ${removed} removed, ${changed} changed)`);
  },
});
