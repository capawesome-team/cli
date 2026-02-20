import appDevicesService from '@/services/app-devices.js';
import appsService from '@/services/apps.js';
import organizationsService from '@/services/organizations.js';
import { withAuth } from '@/utils/auth.js';
import { prompt } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { isInteractive } from '@/utils/environment.js';
import { z } from 'zod';

export default defineCommand({
  description: 'Delete an app device.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      deviceId: z.string().optional().describe('ID of the device.'),
      yes: z.boolean().optional().describe('Skip confirmation prompt.'),
    }),
    { y: 'yes' },
  ),
  action: withAuth(async (options, args) => {
    let { appId, deviceId } = options;

    // Prompt for app ID if not provided
    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizations = await organizationsService.findAll();
      if (organizations.length === 0) {
        consola.error('You must create an organization before deleting a device.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      const organizationId = await prompt(
        'Select the organization of the app from which you want to delete a device.',
        {
          type: 'select',
          options: organizations.map((organization) => ({ label: organization.name, value: organization.id })),
        },
      );
      if (!organizationId) {
        consola.error('You must select the organization of an app from which you want to delete a device.');
        process.exit(1);
      }
      const apps = await appsService.findAll({
        organizationId,
      });
      if (!apps.length) {
        consola.error('You must create an app before deleting a device.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      appId = await prompt('Which app do you want to delete the device from?', {
        type: 'select',
        options: apps.map((app) => ({ label: app.name, value: app.id })),
      });
    }
    // Prompt for device ID if not provided
    if (!deviceId) {
      if (!isInteractive()) {
        consola.error('You must provide the device ID when running in non-interactive environment.');
        process.exit(1);
      }
      deviceId = await prompt('Enter the device ID:', {
        type: 'text',
      });
    }
    // Confirm deletion
    if (!options.yes && isInteractive()) {
      const confirmed = await prompt('Are you sure you want to delete this device?', {
        type: 'confirm',
      });
      if (!confirmed) {
        return;
      }
    }
    // Delete device
    await appDevicesService.delete({
      appId,
      deviceId,
    });
    consola.success('Device deleted successfully.');
  }),
});
