import fs from 'fs';
import os from 'os';
import pathModule from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserError } from './error.js';
import { readFileFromDirectory } from './file.js';

const { mockCreateBufferFromPath } = vi.hoisted(() => ({ mockCreateBufferFromPath: vi.fn() }));

vi.mock('./buffer.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./buffer.js')>();
  mockCreateBufferFromPath.mockImplementation(actual.createBufferFromPath);
  return { ...actual, createBufferFromPath: mockCreateBufferFromPath };
});

const createErrorWithCode = (code: string): Error => Object.assign(new Error(code), { code });

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

    const promise = readFileFromDirectory(path);

    await expect(promise).rejects.toThrow(UserError);
    await expect(promise).rejects.toThrow(`The file could not be read: ${path}. Make sure that no other process`);
  });

  it('should throw a user error if the file is not readable', async () => {
    const path = pathModule.join(directory, 'index.html');
    mockCreateBufferFromPath.mockRejectedValueOnce(createErrorWithCode('EACCES'));

    const promise = readFileFromDirectory(path);

    await expect(promise).rejects.toThrow(UserError);
    await expect(promise).rejects.toThrow(
      `The file could not be read: ${path}. Make sure that you have permission to read the file.`,
    );
  });

  it('should rethrow errors that are not related to reading the file', async () => {
    const error = createErrorWithCode('EISDIR');
    mockCreateBufferFromPath.mockRejectedValueOnce(error);

    await expect(readFileFromDirectory(pathModule.join(directory, 'assets'))).rejects.toBe(error);
  });
});
