import userConfig, { UserConfig } from '../utils/userConfig';

export interface AuthorizationService {
  /**
   * Returns the current authorization token.
   * If running in CI, it will return the CAPAWESOME_TOKEN environment variable.
   * If not running in CI, it will return the token from the local user config.
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
  private readonly userConfig: UserConfig;

  constructor(userConfig: UserConfig) {
    this.userConfig = userConfig;
  }

  getCurrentAuthorizationToken(): string | null {
    return this.userConfig.read().token || process.env.CAPAWESOME_CLOUD_TOKEN || process.env.CAPAWESOME_TOKEN || null;
  }

  hasAuthorizationToken(): boolean {
    return !!this.getCurrentAuthorizationToken();
  }
}

const authorizationService: AuthorizationService = new AuthorizationServiceImpl(userConfig);

export default authorizationService;
