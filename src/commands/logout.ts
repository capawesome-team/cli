import { defineCommand } from 'citty';
import consola from 'consola';
import userConfig from '../utils/userConfig';

export default defineCommand({
  meta: {
    name: 'logout',
    description: 'Sign out from the Capawesome Cloud Console.',
  },
  args: {},
  run: async () => {
    const config = userConfig.read();
    delete config.username;
    delete config.token;
    userConfig.write(config);
    consola.success('Successfully signed out.');
  },
});
