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
        consola.info(`Logged in as ${user.email}.`);
      } catch (error) {
        consola.error('Token is invalid. Please sign in again.');
        process.exit(1);
      }
    } else {
      consola.error('Not logged in.');
      process.exit(1);
    }
  },
});
