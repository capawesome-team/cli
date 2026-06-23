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
  // Set once any keyring operation fails (e.g. a headless CI environment with a
  // present but unusable Secret Service backend). From then on the file token is
  // the single source of truth for the rest of the process, so reads don't
  // return a stale keyring token after a failed write.
  private keyringDisabled = false;

  getToken(): string | null {
    if (!this.keyringDisabled) {
      try {
        const token = this.createEntry().getPassword();
        if (token) {
          return token;
        }
        return this.migrateFileToken();
      } catch {
        this.keyringDisabled = true;
      }
    }
    return userConfig.read().token ?? null;
  }

  setToken(token: string): void {
    if (!this.keyringDisabled) {
      try {
        this.createEntry().setPassword(token);
        this.clearFileToken();
        return;
      } catch {
        this.keyringDisabled = true;
      }
    }
    this.writeFileToken(token);
  }

  deleteToken(): void {
    if (!this.keyringDisabled) {
      try {
        this.createEntry().deletePassword();
      } catch {
        // The deletion throws when there is no credential to delete, but also
        // when the keyring cannot be mutated. Disable the keyring so a stale
        // token can't be read back after the file token has been cleared.
        this.keyringDisabled = true;
      }
    }
    this.clearFileToken();
  }

  private createEntry(): Entry {
    return new Entry(SERVICE_NAME, ACCOUNT_NAME);
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
