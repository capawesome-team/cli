import appDevicesService from '@/services/app-devices.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Remove the forced channel from a device.',
  options: defineOptions(
    z.object({
      appId: z.string().uuid({ message: 'App ID must be a UUID.' }).optional().describe('ID of the app.'),
      deviceId: z.array(z.string()).optional().describe('ID of the device. Can be specified multiple times.'),
    }),
  ),
  action: withAuth(async (options, args) => {
    let { appId, deviceId: deviceIds } = options;

    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizationId = await promptOrganizationSelection();
      appId = await promptAppSelection(organizationId);
    }

    if (!deviceIds || deviceIds.length === 0) {
      if (!isInteractive()) {
        consola.error('You must provide the device ID when running in non-interactive environment.');
        process.exit(1);
      }
      const deviceId = await prompt('Enter the device ID:', {
        type: 'text',
      });
      deviceIds = [deviceId];
    }

    await appDevicesService.updateMany({
      appId,
      deviceIds,
      forcedAppChannelId: null,
    });
    const deviceCount = deviceIds.length;
    consola.success(
      `Forced channel removed from ${deviceCount === 1 ? 'device' : `${deviceCount} devices`} successfully.`,
    );
  }),
});
