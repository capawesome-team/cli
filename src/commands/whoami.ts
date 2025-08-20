import usersService from '@/services/users.js';
import userConfig from '@/utils/user-config.js';
import { defineCommand } from '@robingenz/zli';
import { AxiosError } from 'axios';
import consola from 'consola';

export default defineCommand({
  description: 'Show current user',
  action: async (options, args) => {
    const { token } = userConfig.read();
    if (token) {
      try {
        const user = await usersService.me();
        consola.info(`Logged in as ${user.email}.`);
      } catch (error) {
        if (error instanceof AxiosError && error.response?.status === 401) {
          consola.error('Token is invalid. Please sign in again.');
          process.exit(1);
        } else {
          throw error;
        }
      }
    } else {
      consola.error('Not logged in.');
      process.exit(1);
    }
  },
});
