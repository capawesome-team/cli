import userConfig from '@/utils/user-config.js';
import { randomUUID } from 'node:crypto';

let cachedInstallationId: string | undefined;

/**
 * Returns the random id of this CLI installation, generating and persisting it on first use.
 *
 * The id must stay an opaque random UUID. Never derive it from the hostname, MAC address,
 * user name or any other machine property, as it is sent to the API on every request.
 *
 * Returns `undefined` if the id can neither be read nor persisted, in which case the API
 * falls back to identifying the installation by the user agent.
 */
export function getInstallationId(): string | undefined {
  if (cachedInstallationId) {
    return cachedInstallationId;
  }
  try {
    const config = userConfig.read();
    if (config.installationId) {
      cachedInstallationId = config.installationId;
      return cachedInstallationId;
    }
    const installationId = randomUUID();
    userConfig.write({ ...config, installationId });
    cachedInstallationId = installationId;
    return installationId;
  } catch {
    // Never let a missing installation id break a request.
    return undefined;
  }
}
