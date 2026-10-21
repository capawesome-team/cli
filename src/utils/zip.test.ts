import { describe, expect, it, vi } from 'vitest';
import { UserError } from './error.js';
import zip from './zip.js';

const { mockAddLocalFolder } = vi.hoisted(() => ({ mockAddLocalFolder: vi.fn() }));

vi.mock('adm-zip', () => ({
  default: function () {
    return { addLocalFolder: mockAddLocalFolder, getEntries: () => [], toBuffer: () => Buffer.alloc(0) };
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
