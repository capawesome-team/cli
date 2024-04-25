import { defineCommand } from 'citty';
import consola from 'consola';
import userConfig from '../utils/userConfig';

export default defineCommand({
  meta: {
    name: 'whoami',
    description: 'Show current user',
  },
  run: async () => {
    const { username } = userConfig.read();
    if (!username) {
      consola.error('Not logged in');
    } else {
      consola.info(`Logged in as ${username}`);
    }
  },
});
