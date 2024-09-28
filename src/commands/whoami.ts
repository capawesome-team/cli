import { defineCommand } from 'citty';
import consola from 'consola';
import usersService from '../services/users';
import userConfig from '../utils/userConfig';

export default defineCommand({
  meta: {
    name: 'whoami',
    description: 'Show current user',
  },
  run: async () => {
    const { token } = userConfig.read();
    if (token) {
      try {
        const user = await usersService.me();
        const email = user.email;
        const userProviderProfile = user.userProviderProfiles[0]
          ? user.userProviderProfiles[0]?.provider + ':' + user.userProviderProfiles[0]?.providerUsername
          : null;
        consola.info(`Logged in as ${email || userProviderProfile || '?'}.`);
      } catch (error) {
        consola.error('Token is invalid. Please sign in again.');
      }
    } else {
      consola.error('Not logged in.');
    }
  },
});
