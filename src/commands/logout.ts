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
    userConfig.write({});
    consola.success('Successfully signed out.');
  },
});
