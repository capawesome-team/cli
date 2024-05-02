import { defineCommand } from 'citty';
import consola from 'consola';
import { prompt } from '../../utils/prompt';
import appsService from '../../services/apps';
import { AxiosError } from 'axios';

export default defineCommand({
  meta: {
    description: 'Create a new app.',
  },
  args: {
    name: {
      type: 'string',
      description: 'Name of the app.',
    },
  },
  run: async (ctx) => {
    let name = ctx.args.name;
    if (!name) {
      name = await prompt('Enter the name of the app:', { type: 'text' });
    }
    try {
      const response = await appsService.create({ name });
      consola.success('App created successfully.');
      consola.info(`App ID: ${response.id}`);
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 401) {
        consola.error('Your token is no longer valid. Please sign in again.');
      } else {
        consola.error('Failed to create app.');
      }
    }
  },
});
