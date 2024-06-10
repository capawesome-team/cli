import { defineCommand } from 'citty';
import consola from 'consola';
import { prompt } from '../../utils/prompt';
import appsService from '../../services/apps';
import { getMessageFromUnknownError } from '../../utils/error';

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
      const message = getMessageFromUnknownError(error);
      consola.error(message);
    }
  },
});
