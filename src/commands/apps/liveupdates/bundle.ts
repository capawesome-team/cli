import { isInteractive } from '@/utils/environment.js';
import { fileExistsAtPath, isDirectory } from '@/utils/file.js';
import { generateManifestJson } from '@/utils/manifest.js';
import { prompt } from '@/utils/prompt.js';
import zip from '@/utils/zip.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import fs from 'fs';
import pathModule from 'path';
import { z } from 'zod';

export default defineCommand({
  description: 'Generate manifest file and compress web assets into a bundle.zip file.',
  options: defineOptions(
    z.object({
      inputPath: z.string().optional().describe('Path to the web assets directory.'),
      outputPath: z
        .string()
        .optional()
        .default('./bundle.zip')
        .describe('Output path for the generated artifact file (default: ./bundle.zip).'),
      overwrite: z
        .boolean()
        .optional()
        .default(false)
        .describe('Overwrite output file if it already exists (default: false).'),
      skipManifest: z.boolean().optional().default(false).describe('Skip manifest file generation (default: false).'),
    }),
  ),
  action: async (options, args) => {
    let { inputPath, outputPath, overwrite, skipManifest } = options;

    // 1. Input path resolution
    if (!inputPath) {
      if (!isInteractive()) {
        consola.error('You must provide an input path when running in non-interactive environment.');
        process.exit(1);
      }
      consola.warn('Make sure you have built your web assets before creating a bundle (e.g., `npm run build`).');
      const response = await prompt('Enter the path to the web assets directory (e.g., `dist` or `www`):', {
        type: 'text',
      });
      inputPath = response as string;
    }

    // Convert to absolute path
    inputPath = pathModule.resolve(inputPath);

    // Validate input path exists
    const inputExists = await fileExistsAtPath(inputPath);
    if (!inputExists) {
      consola.error(`Input path does not exist: ${inputPath}`);
      process.exit(1);
    }

    // Validate input is a directory
    const inputIsDirectory = await isDirectory(inputPath);
    if (!inputIsDirectory) {
      consola.error(`Input path must be a directory, not a file: ${inputPath}`);
      process.exit(1);
    }

    // Validate directory contains index.html
    const indexHtmlPath = pathModule.join(inputPath, 'index.html');
    const hasIndexHtml = await fileExistsAtPath(indexHtmlPath);
    if (!hasIndexHtml) {
      consola.error(`Directory must contain an index.html file: ${inputPath}`);
      process.exit(1);
    }

    // 2. Output path resolution
    if (!outputPath) {
      outputPath = './bundle.zip';
    }
    outputPath = pathModule.resolve(outputPath);

    // 3. Check if output exists and handle overwrite
    const outputExists = await fileExistsAtPath(outputPath);
    if (outputExists) {
      if (!overwrite) {
        if (!isInteractive()) {
          consola.error(
            `Output file already exists: ${outputPath}. Use --overwrite flag to skip confirmation or run in interactive mode.`,
          );
          process.exit(1);
        }
        const shouldOverwrite = await prompt('Output file already exists. Overwrite?', {
          type: 'confirm',
          initial: false,
        });
        if (!shouldOverwrite) {
          consola.info('Operation cancelled.');
          process.exit(0);
        }
      }
    }

    // Validate parent directory exists
    const outputDir = pathModule.dirname(outputPath);
    const outputDirExists = await fileExistsAtPath(outputDir);
    if (!outputDirExists) {
      consola.error(`Output directory does not exist: ${outputDir}`);
      process.exit(1);
    }

    // 4. Generate bundle
    consola.start('Generating bundle...');

    try {
      // Generate manifest (unless skipped)
      if (!skipManifest) {
        consola.info('Generating manifest file...');
        await generateManifestJson(inputPath);
      }

      // Compress directory
      consola.info('Compressing directory...');
      const buffer = await zip.zipFolder(inputPath);

      // Write output
      consola.info(`Writing output to ${outputPath}...`);
      await fs.promises.writeFile(outputPath, buffer);

      // Success output
      consola.success(`Bundle created successfully!`);
    } catch (error) {
      consola.error('Failed to generate bundle:');
      if (error instanceof Error) {
        consola.error(error.message);
      }
      process.exit(1);
    }
  },
});
