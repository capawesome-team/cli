import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';
import appsService from '../../services/apps.js';
import organizationsService from '../../services/organizations.js';
import { getMessageFromUnknownError } from '../../utils/error.js';
import { prompt } from '../../utils/prompt.js';

export default defineCommand({
  description: 'Delete an app.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
    }),
  ),
  action: async (options, args) => {
    let { appId } = options;
    if (!appId) {
      const organizations = await organizationsService.findAll();
      if (organizations.length === 0) {
        consola.error('You must create an organization before deleting an app.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      const organizationId = await prompt('Which organization do you want to delete the app from?', {
        type: 'select',
        options: organizations.map((organization) => ({ label: organization.name, value: organization.id })),
      });
      if (!organizationId) {
        consola.error('You must select an organization to delete the app from.');
        process.exit(1);
      }
      const apps = await appsService.findAll({
        organizationId,
      });
      if (!apps.length) {
        consola.error('You must create an app before deleting it.');
        process.exit(1);
      }
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
      process.exit(1);
    }
  },
});
