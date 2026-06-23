import { defineCommand } from '@robingenz/zli';
import consola from 'consola';
import authorizationService from '@/services/authorization-service.js';
import sessionsService from '@/services/sessions.js';
import credentialStore from '@/utils/credential-store.js';
import userConfig from '@/utils/user-config.js';

export default defineCommand({
  description: 'Sign out from the Capawesome Cloud Console.',
  action: async (options, args) => {
    const token = authorizationService.getCurrentAuthorizationToken();
    // Clear the session id and user ID but keep other flags (e.g. the telemetry notice).
    const { sessionId, token: _token, userId: _userId, ...persistentConfig } = userConfig.read();
    if (token && !token.startsWith('ca_')) {
      // Delete by the stored session id. Fall back to the token for sessions
      // created before the token/id split, whose token equals the id.
      await sessionsService.delete({ id: sessionId ?? token }).catch(() => {});
    }
    credentialStore.deleteToken();
    userConfig.write(persistentConfig);
    consola.success('Successfully signed out.');
  },
});
