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
    if (token && !token.startsWith('ca_')) {
      await sessionsService.delete({ id: token }).catch(() => {});
    }
    credentialStore.deleteToken();
    // Clear the user ID but keep other flags (e.g. the telemetry notice).
    const { token: _token, userId: _userId, ...persistentConfig } = userConfig.read();
    userConfig.write(persistentConfig);
    consola.success('Successfully signed out.');
  },
});
