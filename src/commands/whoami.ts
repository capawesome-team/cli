import consola from 'consola';
import { defineCommand } from '../parser/config.js';
import usersService from '../services/users.js';
import userConfig from '../utils/userConfig.js';

export default defineCommand({
  description: 'Show current user',
  action: async (options, args) => {
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
