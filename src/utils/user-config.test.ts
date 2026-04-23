import { homedir } from 'node:os';
import { resolve } from 'node:path';
import { readUser, writeUser } from 'rc9';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UserError } from './error.js';
import userConfig from './user-config.js';

vi.mock('rc9');

describe('userConfig', () => {
  const mockReadUser = vi.mocked(readUser);
  const mockWriteUser = vi.mocked(writeUser);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createFsError = (code: string, path: string): Error => Object.assign(new Error(code), { code, path });

  describe('read', () => {
    it('should return the config on success', () => {
      mockReadUser.mockReturnValue({ token: 'abc' });
      expect(userConfig.read()).toEqual({ token: 'abc' });
    });

    it('should throw UserError on EACCES with the failing path in the message', () => {
      const error = createFsError('EACCES', '/home/user/.capawesome');
      mockReadUser.mockImplementation(() => {
        throw error;
      });
      expect(() => userConfig.read()).toThrow(UserError);
      expect(() => userConfig.read()).toThrow(/\/home\/user\/\.capawesome/);
    });

    it('should throw UserError on EPERM', () => {
      const error = createFsError('EPERM', '/home/user/.capawesome');
      mockReadUser.mockImplementation(() => {
        throw error;
      });
      expect(() => userConfig.read()).toThrow(UserError);
    });

    it('should fall back to the resolved home path when the error has no path', () => {
      const error = Object.assign(new Error('EACCES'), { code: 'EACCES' });
      mockReadUser.mockImplementation(() => {
        throw error;
      });
      const expectedPath = resolve(process.env.XDG_CONFIG_HOME || homedir(), '.capawesome');
      expect(() => userConfig.read()).toThrow(expectedPath);
    });

    it('should rethrow non-access errors as-is', () => {
      const error = new Error('something else');
      mockReadUser.mockImplementation(() => {
        throw error;
      });
      let caught: unknown;
      try {
        userConfig.read();
      } catch (e) {
        caught = e;
      }
      expect(caught).toBe(error);
    });
  });

  describe('write', () => {
    it('should call writeUser on success', () => {
      userConfig.write({ token: 'abc' });
      expect(mockWriteUser).toHaveBeenCalledWith({ token: 'abc' }, { name: '.capawesome' });
    });

    it('should throw UserError on EACCES with the failing path in the message', () => {
      const error = createFsError('EACCES', '/home/user/.capawesome');
      mockWriteUser.mockImplementation(() => {
        throw error;
      });
      expect(() => userConfig.write({})).toThrow(UserError);
      expect(() => userConfig.write({})).toThrow(/\/home\/user\/\.capawesome/);
    });

    it('should throw UserError on EPERM', () => {
      const error = createFsError('EPERM', '/home/user/.capawesome');
      mockWriteUser.mockImplementation(() => {
        throw error;
      });
      expect(() => userConfig.write({})).toThrow(UserError);
    });

    it('should rethrow non-access errors as-is', () => {
      const error = new Error('something else');
      mockWriteUser.mockImplementation(() => {
        throw error;
      });
      let caught: unknown;
      try {
        userConfig.write({});
      } catch (e) {
        caught = e;
      }
      expect(caught).toBe(error);
    });
  });
});
