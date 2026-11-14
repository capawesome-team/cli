import fs from 'fs';
import os from 'os';
import pathModule from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UserError } from './error.js';
import { isDirectory, readFileFromDirectory, writeFile } from './file.js';

const { mockCreateBufferFromPath } = vi.hoisted(() => ({ mockCreateBufferFromPath: vi.fn() }));

vi.mock('./buffer.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./buffer.js')>();
  mockCreateBufferFromPath.mockImplementation(actual.createBufferFromPath);
  return { ...actual, createBufferFromPath: mockCreateBufferFromPath };
});

const createErrorWithCode = (code: string): Error => Object.assign(new Error(code), { code });

describe('isDirectory', () => {
  let directory: string;

  beforeEach(() => {
    directory = fs.mkdtempSync(pathModule.join(os.tmpdir(), 'file-'));
  });

  afterEach(() => {
    fs.rmSync(directory, { force: true, recursive: true });
  });

  it('should return true for a directory', async () => {
    await expect(isDirectory(directory)).resolves.toBe(true);
  });

  it('should return false for a file', async () => {
    const path = pathModule.join(directory, 'index.html');
    fs.writeFileSync(path, '<html></html>');

    await expect(isDirectory(path)).resolves.toBe(false);
  });

  it('should return false if the path does not exist', async () => {
    await expect(isDirectory(pathModule.join(directory, 'missing'))).resolves.toBe(false);
  });
});

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

describe('writeFile', () => {
  let directory: string;

  beforeEach(() => {
    directory = fs.mkdtempSync(pathModule.join(os.tmpdir(), 'file-'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    fs.rmSync(directory, { force: true, recursive: true });
  });

  it('should write the file', async () => {
    const path = pathModule.join(directory, 'public.pem');

    await writeFile(path, 'key');

    expect(fs.readFileSync(path, 'utf8')).toBe('key');
  });

  it.each(['EACCES', 'EPERM'])('should throw a user error if the file is not writable (%s)', async (code) => {
    const path = pathModule.join(directory, 'public.pem');
    vi.spyOn(fs.promises, 'writeFile').mockRejectedValueOnce(createErrorWithCode(code));

    const promise = writeFile(path, 'key');

    await expect(promise).rejects.toThrow(UserError);
    await expect(promise).rejects.toThrow(
      `The file could not be written: ${path}. Make sure that you have permission to write to the folder or choose a different path.`,
    );
  });

  it('should rethrow errors that are not related to permissions', async () => {
    const error = createErrorWithCode('EISDIR');
    vi.spyOn(fs.promises, 'writeFile').mockRejectedValueOnce(error);

    await expect(writeFile(directory, 'key')).rejects.toBe(error);
  });
});
