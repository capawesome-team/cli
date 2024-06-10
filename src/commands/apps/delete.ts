import { defineCommand } from 'citty';
import consola from 'consola';
import { prompt } from '../../utils/prompt';
import appsService from '../../services/apps';
import { getMessageFromUnknownError } from '../../utils/error';

export default defineCommand({
  meta: {
    description: 'Delete an app.',
  },
  args: {
    appId: {
      type: 'string',
      description: 'ID of the app.',
    },
  },
  run: async (ctx) => {
    let appId = ctx.args.appId;
    if (!appId) {
      const apps = await appsService.findAll();
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      appId = await prompt('Which app do you want to delete?', {
        type: 'select',
        options: apps.map((app) => ({ label: app.name, value: app.id })),
      });
    }
    const confirmed = await prompt('Are you sure you want to delete this app?', {
      type: 'confirm',
    });
    if (!confirmed) {
      return;
    }
    try {
      await appsService.delete({ id: appId });
      consola.success('App deleted successfully.');
    } catch (error) {
      const message = getMessageFromUnknownError(error);
      consola.error(message);
    }
  },
});
