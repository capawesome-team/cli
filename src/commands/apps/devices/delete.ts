import { defineCommand } from 'citty';
import consola from 'consola';
import appsService from '../../../services/apps';
import { prompt } from '../../../utils/prompt';
import appDevicesService from '../../../services/app-devices';
import { getMessageFromUnknownError } from '../../../utils/error';

export default defineCommand({
  meta: {
    description: 'Delete an app device.',
  },
  args: {
    appId: {
      type: 'string',
      description: 'ID of the app.',
    },
    deviceId: {
      type: 'string',
      description: 'ID of the device.',
    },
  },
  run: async (ctx) => {
    let appId = ctx.args.appId;
    if (!appId) {
      const apps = await appsService.findAll();
      if (!apps.length) {
        consola.error('You must create an app before deleting a device.');
        return;
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      appId = await prompt('Which app do you want to delete the device from?', {
        type: 'select',
        options: apps.map((app) => ({ label: app.name, value: app.id })),
      });
    }
    let deviceId = ctx.args.deviceId;
    if (!deviceId) {
      deviceId = await prompt('Enter the device ID:', {
        type: 'text',
      });
    }
    const confirmed = await prompt('Are you sure you want to delete this device?', {
      type: 'confirm',
    });
    if (!confirmed) {
      return;
    }
    try {
      await appDevicesService.delete({
        appId,
        deviceId,
      });
      consola.success('Device deleted successfully.');
    } catch (error) {
      const message = getMessageFromUnknownError(error);
      consola.error(message);
    }
  },
});
