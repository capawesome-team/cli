import { defineCommand } from 'citty';
import consola from 'consola';
import authorizationService from '../services/authorization-service';
import sessionsService from '../services/sessions';
import userConfig from '../utils/userConfig';

export default defineCommand({
  meta: {
    name: 'logout',
    description: 'Sign out from the Capawesome Cloud Console.',
  },
  args: {},
  run: async () => {
    const token = authorizationService.getCurrentAuthorizationToken();
    if (token && !token.startsWith('ca_')) {
      await sessionsService.delete({ id: token }).catch(() => {});
    }
    userConfig.write({});
    consola.success('Successfully signed out.');
  },
});
