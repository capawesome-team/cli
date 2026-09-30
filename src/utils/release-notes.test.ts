import consola from 'consola';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseReleaseNotes } from './release-notes.js';

vi.mock('consola');

describe('parseReleaseNotes', () => {
  const mockConsola = vi.mocked(consola);
  let tempDirectory: string;
  let releaseNotesFile: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
      throw new Error(`Process exited with code ${code}`);
    });
    tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'capawesome-cli-release-notes-'));
    releaseNotesFile = path.join(tempDirectory, 'release-notes.json');
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fs.rm(tempDirectory, { force: true, recursive: true });
  });

  it('should return undefined if no release notes are passed', async () => {
    await expect(parseReleaseNotes({})).resolves.toBeUndefined();
  });

  it('should use the release notes as the default text', async () => {
    await expect(parseReleaseNotes({ releaseNotes: 'Bug fixes' })).resolves.toEqual({ default: 'Bug fixes' });
  });

  it('should add the translated release notes split at the first `=`', async () => {
    const releaseNotes = await parseReleaseNotes({
      releaseNotes: 'Bug fixes',
      releaseNotesLocale: ['de-DE=Fehlerbehebungen', 'fr-FR=Corrections = bugs'],
    });

    expect(releaseNotes).toEqual({ default: 'Bug fixes', 'de-DE': 'Fehlerbehebungen', 'fr-FR': 'Corrections = bugs' });
  });

  it('should reject translated release notes without a default text', async () => {
    await expect(parseReleaseNotes({ releaseNotesLocale: ['de-DE=Fehlerbehebungen'] })).rejects.toThrow(
      'Process exited with code 1',
    );

    expect(mockConsola.error).toHaveBeenCalledWith('Release notes require a default text (--release-notes).');
  });

  it('should reject translated release notes without a locale', async () => {
    await expect(
      parseReleaseNotes({ releaseNotes: 'Bug fixes', releaseNotesLocale: ['Fehlerbehebungen'] }),
    ).rejects.toThrow('Process exited with code 1');

    expect(mockConsola.error).toHaveBeenCalledWith(
      'Invalid release notes locale `Fehlerbehebungen`. Use the format `<locale>=<text>`.',
    );
  });

  it('should reject translated release notes for the reserved `default` locale', async () => {
    await expect(
      parseReleaseNotes({ releaseNotes: 'Bug fixes', releaseNotesLocale: ['default=Fehlerbehebungen'] }),
    ).rejects.toThrow('Process exited with code 1');

    expect(mockConsola.error).toHaveBeenCalledWith(
      'The locale `default` is reserved. Use --release-notes for the default text.',
    );
  });

  it('should read the release notes from a file', async () => {
    await fs.writeFile(releaseNotesFile, JSON.stringify({ default: 'Bug fixes', 'de-DE': 'Fehlerbehebungen' }));

    await expect(parseReleaseNotes({ releaseNotesFile })).resolves.toEqual({
      default: 'Bug fixes',
      'de-DE': 'Fehlerbehebungen',
    });
  });

  it('should reject a file combined with other release notes flags', async () => {
    await expect(parseReleaseNotes({ releaseNotes: 'Bug fixes', releaseNotesFile })).rejects.toThrow(
      'Process exited with code 1',
    );

    expect(mockConsola.error).toHaveBeenCalledWith(
      'The --release-notes-file flag cannot be used together with --release-notes or --release-notes-locale.',
    );
  });

  it('should reject a file without a default text', async () => {
    await fs.writeFile(releaseNotesFile, JSON.stringify({ 'de-DE': 'Fehlerbehebungen' }));

    await expect(parseReleaseNotes({ releaseNotesFile })).rejects.toThrow('Process exited with code 1');

    expect(mockConsola.error).toHaveBeenCalledWith(
      'The release notes file must contain a JSON object of texts by locale with a `default` key.',
    );
  });

  it('should reject a file with invalid JSON', async () => {
    await fs.writeFile(releaseNotesFile, 'Bug fixes');

    await expect(parseReleaseNotes({ releaseNotesFile })).rejects.toThrow('Process exited with code 1');

    expect(mockConsola.error).toHaveBeenCalledWith(
      `The release notes file is missing or contains invalid JSON: ${releaseNotesFile}`,
    );
  });

  it('should reject an empty file path', async () => {
    await expect(parseReleaseNotes({ releaseNotesFile: '' })).rejects.toThrow('Process exited with code 1');

    expect(mockConsola.error).toHaveBeenCalledWith('The release notes file is missing or contains invalid JSON: ');
  });
});
