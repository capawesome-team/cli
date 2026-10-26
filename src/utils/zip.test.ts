import fs from 'fs';
import os from 'os';
import path from 'path';
import { describe, expect, it, vi } from 'vitest';
import { UserError } from './error.js';
import zip from './zip.js';

const { mockAddLocalFile, mockAddLocalFolder } = vi.hoisted(() => ({
  mockAddLocalFile: vi.fn(),
  mockAddLocalFolder: vi.fn(),
}));

vi.mock('adm-zip', () => ({
  default: function () {
    return {
      addLocalFile: mockAddLocalFile,
      addLocalFolder: mockAddLocalFolder,
      getEntries: () => [],
      toBuffer: () => Buffer.alloc(0),
    };
  },
}));

describe('zipFolder', () => {
  it('should throw a user error if a file vanished while zipping', async () => {
    mockAddLocalFolder.mockImplementationOnce(() => {
      throw new Error('ADM-ZIP: File not found: "www/index.html"');
    });

    const promise = zip.zipFolder('www');

    await expect(promise).rejects.toThrow(UserError);
    await expect(promise).rejects.toThrow(
      'The file could not be read: www/index.html. Make sure that no other process',
    );
  });

  it('should rethrow other errors', async () => {
    mockAddLocalFolder.mockImplementationOnce(() => {
      throw new Error('ADM-ZIP: Invalid filename');
    });

    const promise = zip.zipFolder('www');

    await expect(promise).rejects.not.toThrow(UserError);
    await expect(promise).rejects.toThrow('ADM-ZIP: Invalid filename');
  });
});

describe('zipFolderWithGitignore', () => {
  it('should skip symbolic links that point outside the source folder', async () => {
    const tempFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'zip-test-'));
    const sourceFolder = path.join(tempFolder, 'source');
    const outsideFolder = path.join(tempFolder, 'outside');
    fs.mkdirSync(sourceFolder);
    fs.mkdirSync(outsideFolder);
    fs.writeFileSync(path.join(sourceFolder, 'index.html'), '');
    fs.writeFileSync(path.join(outsideFolder, 'file.txt'), '');
    fs.symlinkSync(path.join(outsideFolder, 'file.txt'), path.join(sourceFolder, 'file-link.txt'));
    fs.symlinkSync(outsideFolder, path.join(sourceFolder, 'folder-link'));

    try {
      await zip.zipFolderWithGitignore(sourceFolder);
    } finally {
      fs.rmSync(tempFolder, { recursive: true, force: true });
    }

    expect(mockAddLocalFile).toHaveBeenCalledTimes(1);
    expect(mockAddLocalFile).toHaveBeenCalledWith(path.join(sourceFolder, 'index.html'), '');
  });
});
