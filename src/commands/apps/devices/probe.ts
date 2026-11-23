import appDevicesService from '@/services/app-devices.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import consola from 'consola';
import { z } from 'zod';
import { defineCommand, defineOptions } from 'zodline';

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

    const probe = await appDevicesService.probe({ appId, deviceId });

    if (json) {
      // TODO: Remove `bundleId` with the next major version. https://github.com/capawesome-team/cli/issues/281
      console.log(JSON.stringify({ ...probe, bundleId: probe.bundle?.id ?? null }, null, 2));
    } else if (probe.result === 'available') {
      console.table({ bundleId: probe.bundle?.id, channelName: probe.channelName });
      consola.success('Update available for this device.');
    } else if (probe.result === 'up_to_date') {
      consola.info('This device is up to date.');
    } else {
      consola.info(
        probe.reason
          ? `No update available for this device (${probe.reason}).`
          : 'No update available for this device.',
      );
    }
  }),
});
