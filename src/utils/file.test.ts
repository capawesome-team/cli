import fs from 'fs';
import os from 'os';
import pathModule from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { UserError } from './error.js';
import { readFileFromDirectory } from './file.js';

describe('readFileFromDirectory', () => {
  let directory: string;

  beforeEach(() => {
    directory = fs.mkdtempSync(pathModule.join(os.tmpdir(), 'file-'));
  });

  afterEach(() => {
    fs.rmSync(directory, { force: true, recursive: true });
  });

  it('should read the file', async () => {
    const path = pathModule.join(directory, 'index.html');
    fs.writeFileSync(path, '<html></html>');

    const buffer = await readFileFromDirectory(path);

    expect(buffer.toString()).toBe('<html></html>');
  });

  it('should throw a user error if the file no longer exists', async () => {
    const path = pathModule.join(directory, 'missing.png');

    await expect(readFileFromDirectory(path)).rejects.toThrow(UserError);
  });
});
