import consola from 'consola';
import fs from 'fs/promises';
import { z } from 'zod';

const releaseNotesFileSchema = z.record(z.string(), z.string()).refine((releaseNotes) => 'default' in releaseNotes);

export const parseReleaseNotes = async (options: {
  releaseNotes?: string;
  releaseNotesFile?: string;
  releaseNotesLocale?: string[];
}): Promise<Record<string, string> | undefined> => {
  const { releaseNotes, releaseNotesFile, releaseNotesLocale } = options;
  if (releaseNotesFile !== undefined) {
    if (releaseNotes !== undefined || releaseNotesLocale !== undefined) {
      consola.error(
        'The --release-notes-file flag cannot be used together with --release-notes or --release-notes-locale.',
      );
      process.exit(1);
    }
    return readReleaseNotesFile(releaseNotesFile);
  }
  if (releaseNotes === undefined && releaseNotesLocale === undefined) {
    return undefined;
  }
  if (releaseNotes === undefined) {
    consola.error('Release notes require a default text (--release-notes).');
    process.exit(1);
  }
  return { default: releaseNotes, ...parseLocalizedReleaseNotes(releaseNotesLocale ?? []) };
};

const parseLocalizedReleaseNotes = (entries: string[]): Record<string, string> => {
  const localizedReleaseNotes: Record<string, string> = {};
  for (const entry of entries) {
    const separatorIndex = entry.indexOf('=');
    if (separatorIndex <= 0) {
      consola.error(`Invalid release notes locale \`${entry}\`. Use the format \`<locale>=<text>\`.`);
      process.exit(1);
    }
    const locale = entry.slice(0, separatorIndex);
    if (locale === 'default') {
      consola.error('The locale `default` is reserved. Use --release-notes for the default text.');
      process.exit(1);
    }
    localizedReleaseNotes[locale] = entry.slice(separatorIndex + 1);
  }
  return localizedReleaseNotes;
};

const readReleaseNotesFile = async (filePath: string): Promise<Record<string, string>> => {
  let json: unknown;
  try {
    json = JSON.parse(await fs.readFile(filePath, 'utf-8'));
  } catch {
    consola.error(`The release notes file is missing or contains invalid JSON: ${filePath}`);
    process.exit(1);
  }
  const result = releaseNotesFileSchema.safeParse(json);
  if (!result.success) {
    consola.error('The release notes file must contain a JSON object of texts by locale with a `default` key.');
    process.exit(1);
  }
  return result.data;
};
