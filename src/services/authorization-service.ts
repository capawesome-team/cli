import credentialStore, { CredentialStore } from '@/utils/credential-store.js';

export interface AuthorizationService {
  /**
   * Returns the current authorization token.
   * It prefers the token from the secure credential store and falls back to the
   * CAPAWESOME_CLOUD_TOKEN and CAPAWESOME_TOKEN environment variables.
   * If no token is found, it will return null.
   * @returns The current authorization token or null.
   */
  getCurrentAuthorizationToken(): string | null;

  /**
   * Checks if there is an authorization token available based on the current environment.
   * @returns True if there is an authorization token available.
   */
  hasAuthorizationToken(): boolean;
}

class AuthorizationServiceImpl implements AuthorizationService {
  private readonly credentialStore: CredentialStore;

  constructor(credentialStore: CredentialStore) {
    this.credentialStore = credentialStore;
  }

  getCurrentAuthorizationToken(): string | null {
    const token =
      this.credentialStore.getToken() || process.env.CAPAWESOME_CLOUD_TOKEN || process.env.CAPAWESOME_TOKEN || null;
    // Trim to remove newline characters that may be included when pasting a token,
    // which would cause an invalid character error in the Authorization header.
    const trimmedToken = token?.trim();
    return trimmedToken || null;
  }

  hasAuthorizationToken(): boolean {
    return !!this.getCurrentAuthorizationToken();
  }
}

const authorizationService: AuthorizationService = new AuthorizationServiceImpl(credentialStore);

export default authorizationService;
