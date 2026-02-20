import appDevicesService from '@/services/app-devices.js';
import { withAuth } from '@/utils/auth.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
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
      const organizationId = await promptOrganizationSelection();
      appId = await promptAppSelection(organizationId);
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
