import appDevicesService from '@/services/app-devices.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import { AxiosError } from 'axios';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Check whether a device would receive a live update.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      deviceId: z.string().optional().describe('ID of the device.'),
      json: z.boolean().optional().describe('Output in JSON format.'),
    }),
  ),
  action: withAuth(async (options) => {
    let { appId, deviceId, json } = options;

    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizationId = await promptOrganizationSelection();
      appId = await promptAppSelection(organizationId);
    }

    if (!deviceId) {
      if (!isInteractive()) {
        consola.error('You must provide the device ID when running in non-interactive environment.');
        process.exit(1);
      }
      deviceId = await prompt('Enter the device ID:', {
        type: 'text',
      });
    }

    const device = await appDevicesService.findOneById({ appId, deviceId });

    try {
      const result = await appDevicesService.probe({
        appId,
        appVersionCode: device.appVersionCode,
        appVersionName: device.appVersionName,
        channelName: device.appChannel?.name,
        customId: device.customId ?? undefined,
        deviceId: device.id,
        osVersion: device.osVersion,
        platform: device.platform,
        pluginVersion: device.pluginVersion,
      });

      if (json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.table(result);
        consola.success('Update available for this device.');
      }
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404) {
        consola.info('No update available for this device.');
      } else {
        throw error;
      }
    }
  }),
});
