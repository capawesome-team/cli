import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetPassword, mockSetPassword, mockDeletePassword, mockRead, mockWrite } = vi.hoisted(() => ({
  mockGetPassword: vi.fn(),
  mockSetPassword: vi.fn(),
  mockDeletePassword: vi.fn(),
  mockRead: vi.fn(),
  mockWrite: vi.fn(),
}));

vi.mock('@napi-rs/keyring', () => ({
  Entry: vi.fn(function () {
    return {
      getPassword: mockGetPassword,
      setPassword: mockSetPassword,
      deletePassword: mockDeletePassword,
    };
  }),
}));

vi.mock('@/utils/user-config.js', () => ({
  default: { read: mockRead, write: mockWrite },
}));

const loadCredentialStore = async () => {
  const module = await import('./credential-store.js');
  return module.default;
};

describe('credentialStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockRead.mockReturnValue({});
  });

  describe('when the keyring is available', () => {
    beforeEach(() => {
      mockGetPassword.mockReturnValue(null);
    });

    it('should return the token from the keyring', async () => {
      mockGetPassword.mockReturnValue('keyring-token');
      const credentialStore = await loadCredentialStore();

      expect(credentialStore.getToken()).toBe('keyring-token');
    });

    it('should return null when no token is stored', async () => {
      const credentialStore = await loadCredentialStore();

      expect(credentialStore.getToken()).toBeNull();
    });

    it('should migrate a plaintext token from the config file into the keyring', async () => {
      mockRead.mockReturnValue({ token: 'file-token', userId: 'user-1' });
      const credentialStore = await loadCredentialStore();

      expect(credentialStore.getToken()).toBe('file-token');
      expect(mockSetPassword).toHaveBeenCalledWith('file-token');
      expect(mockWrite).toHaveBeenCalledWith({ userId: 'user-1' });
    });

    it('should store the token in the keyring and strip the plaintext copy', async () => {
      mockRead.mockReturnValue({ token: 'old-token', userId: 'user-1' });
      const credentialStore = await loadCredentialStore();

      credentialStore.setToken('new-token');

      expect(mockSetPassword).toHaveBeenCalledWith('new-token');
      expect(mockWrite).toHaveBeenCalledWith({ userId: 'user-1' });
    });

    it('should delete the token from the keyring', async () => {
      const credentialStore = await loadCredentialStore();

      credentialStore.deleteToken();

      expect(mockDeletePassword).toHaveBeenCalled();
    });
  });

  describe('when the keyring is unavailable', () => {
    beforeEach(() => {
      mockGetPassword.mockImplementation(() => {
        throw new Error('no keyring backend');
      });
    });

    it('should return the token from the config file', async () => {
      mockRead.mockReturnValue({ token: 'file-token' });
      const credentialStore = await loadCredentialStore();

      expect(credentialStore.getToken()).toBe('file-token');
      expect(mockSetPassword).not.toHaveBeenCalled();
    });

    it('should store the token in the config file while preserving other fields', async () => {
      mockRead.mockReturnValue({ userId: 'user-1' });
      const credentialStore = await loadCredentialStore();

      credentialStore.setToken('file-token');

      expect(mockWrite).toHaveBeenCalledWith({ userId: 'user-1', token: 'file-token' });
      expect(mockSetPassword).not.toHaveBeenCalled();
    });
  });
});
