import { isInteractive } from '@/utils/environment.js';
import { directoryContainsSourceMaps, directoryContainsSymlinks, fileExistsAtPath, isDirectory } from '@/utils/file.js';
import { generateManifestJson } from '@/utils/manifest.js';
import { prompt } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Generate a manifest file.',
  options: defineOptions(
    z.object({
      path: z.string().optional().describe('Path to the web assets folder (e.g. `www` or `dist`).'),
    }),
  ),
  action: async (options: any, args: any) => {
    let path = options.path;

    if (!path) {
      if (!isInteractive()) {
        consola.error(
          'You must provide the path to the web assets folder when running in non-interactive environment.',
        );
        process.exit(1);
      }
      consola.warn('Make sure you have built your web assets before generating the manifest (e.g., `npm run build`).');
      path = await prompt('Enter the path to the web assets folder (e.g., `dist` or `www`):', {
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
    // Check if the path is a directory
    const pathIsDirectory = await isDirectory(path);
    if (!pathIsDirectory) {
      consola.error(`The path is not a directory.`);
      process.exit(1);
    }
    // Check for source maps
    const containsSourceMaps = await directoryContainsSourceMaps(path);
    if (containsSourceMaps) {
      consola.warn(
        'Source map files were detected in the specified path. Source maps should not be distributed to end users as they expose your original source code and increase the download size. Consider excluding source map files from your build output.',
      );
    }

    // Check for symlinks
    const containsSymlinks = await directoryContainsSymlinks(path);
    if (containsSymlinks) {
      consola.warn(
        'Symbolic links were detected in the specified path. Symbolic links are skipped during manifest generation.',
      );
    }

    // Generate the manifest file
    await generateManifestJson(path);

    consola.success('Manifest file generated.');
  },
});
