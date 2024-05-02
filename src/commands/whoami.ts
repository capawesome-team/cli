import { defineCommand } from 'citty';
import consola from 'consola';
import userConfig from '../utils/userConfig';
import usersService from '../services/users';

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
        consola.info(`Logged in as ${user.email}.`);
      } catch (error) {
        consola.error('Token is invalid. Please sign in again.');
      }
    } else {
      consola.error('Not logged in.');
    }
  },
});
