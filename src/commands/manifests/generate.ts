import { defineCommand } from 'citty';
import consola from 'consola';
import { fileExistsAtPath } from '../../utils/file';
import { generateManifestJson } from '../../utils/manifest';
import { prompt } from '../../utils/prompt';

export default defineCommand({
  meta: {
    description: 'Generate a manifest file.',
  },
  args: {
    path: {
      type: 'string',
      description: 'Path to the web assets folder (e.g. `www` or `dist`).',
    },
  },
  run: async (ctx) => {
    let path = ctx.args.path as string | undefined;

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
