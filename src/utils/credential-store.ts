import userConfig from '@/utils/user-config.js';
import { Entry } from '@napi-rs/keyring';

const SERVICE_NAME = 'capawesome-cli';
const ACCOUNT_NAME = 'token';

export interface CredentialStore {
  /**
   * Returns the stored authentication token or null if none is stored.
   */
  getToken(): string | null;
  /**
   * Stores the authentication token.
   */
  setToken(token: string): void;
  /**
   * Removes the stored authentication token.
   */
  deleteToken(): void;
}

/**
 * Stores the authentication token in the operating system's secure storage
 * (macOS Keychain, Windows Credential Manager, Linux Secret Service) when
 * available and falls back to the plaintext user config file otherwise
 * (e.g. headless CI environments without a keyring backend).
 */
class CredentialStoreImpl implements CredentialStore {
  private keyringAvailable: boolean | null = null;

  getToken(): string | null {
    if (!this.isKeyringAvailable()) {
      return userConfig.read().token ?? null;
    }
    const token = this.createEntry().getPassword();
    if (token) {
      return token;
    }
    return this.migrateFileToken();
  }

  setToken(token: string): void {
    if (!this.isKeyringAvailable()) {
      this.writeFileToken(token);
      return;
    }
    this.createEntry().setPassword(token);
    this.clearFileToken();
  }

  deleteToken(): void {
    if (this.isKeyringAvailable()) {
      try {
        this.createEntry().deletePassword();
      } catch {
        // Ignore errors when there is no credential to delete.
      }
    }
    this.clearFileToken();
  }

  private createEntry(): Entry {
    return new Entry(SERVICE_NAME, ACCOUNT_NAME);
  }

  private isKeyringAvailable(): boolean {
    if (this.keyringAvailable === null) {
      try {
        // Probe the backend with a read. This throws if no keyring backend is
        // available, but returns null for a missing credential.
        this.createEntry().getPassword();
        this.keyringAvailable = true;
      } catch {
        this.keyringAvailable = false;
      }
    }
    return this.keyringAvailable;
  }

  /**
   * Moves a token stored in the plaintext config file into the keyring and
   * removes the plaintext copy. Returns the migrated token or null.
   */
  private migrateFileToken(): string | null {
    const fileToken = userConfig.read().token;
    if (!fileToken) {
      return null;
    }
    this.setToken(fileToken);
    return fileToken;
  }

  private writeFileToken(token: string): void {
    const config = userConfig.read();
    userConfig.write({ ...config, token });
  }

  private clearFileToken(): void {
    const { token, ...rest } = userConfig.read();
    if (token === undefined) {
      return;
    }
    userConfig.write(rest);
  }
}

const credentialStore: CredentialStore = new CredentialStoreImpl();

export default credentialStore;
