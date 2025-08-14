import { defineCommand, defineOptions } from 'zodest/config';
import { z } from 'zod';
import consola from 'consola';
import { fileExistsAtPath } from '../../utils/file.js';
import { generateManifestJson } from '../../utils/manifest.js';
import { prompt } from '../../utils/prompt.js';

export default defineCommand({
  description: 'Generate a manifest file.',
  options: defineOptions(
    z.object({
      path: z.string().optional().describe('Path to the web assets folder (e.g. `www` or `dist`).'),
    }),
  ),
  action: async (options, args) => {
    let path = options.path;

    if (!path) {
      path = await prompt('Enter the path to the web assets folder:', {
        type: 'text',
      });
      if (!path) {
        consola.error('You must provide a path to the web assets folder.');
        process.exit(1);
      }
    }

    // Check if the path exists
    const pathExists = await fileExistsAtPath(path);
    if (!pathExists) {
      consola.error(`The path does not exist.`);
      process.exit(1);
    }
    // Generate the manifest file
    await generateManifestJson(path);

    consola.success('Manifest file generated.');
  },
});
