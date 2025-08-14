import { defineCommand } from '../parser/config.js';
import consola from 'consola';
import authorizationService from '../services/authorization-service.js';
import sessionsService from '../services/sessions.js';
import userConfig from '../utils/userConfig.js';

export default defineCommand({
  description: 'Sign out from the Capawesome Cloud Console.',
  action: async (options, args) => {
    const token = authorizationService.getCurrentAuthorizationToken();
    if (token && !token.startsWith('ca_')) {
      await sessionsService.delete({ id: token }).catch(() => {});
    }
    userConfig.write({});
    consola.success('Successfully signed out.');
  },
});
