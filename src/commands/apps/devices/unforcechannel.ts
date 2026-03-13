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
      deviceId: z.string().optional().describe('ID of the device.'),
    }),
  ),
  action: withAuth(async (options, args) => {
    let { appId, deviceId } = options;

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

    await appDevicesService.update({
      appId,
      deviceId,
      forcedAppChannelId: null,
    });
    consola.success('Forced channel removed from device successfully.');
  }),
});
