import appChannelsService from '@/services/app-channels.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { getMessageFromUnknownError } from '@/utils/error.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Create a new app channel.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      expiresInDays: z.coerce
        .number({
          message: 'Expiration days must be an integer.',
        })
        .int({
          message: 'Expiration days must be an integer.',
        })
        .optional()
        .describe('The number of days until the channel is automatically deleted.'),
      ignoreErrors: z.boolean().optional().describe('Whether to ignore errors or not.'),
      name: z.string().optional().describe('Name of the channel.'),
      protected: z.boolean().optional().describe('Whether to protect the channel or not. Default is `false`.'),
    }),
  ),
  action: withAuth(async (options, args) => {
    let { appId, expiresInDays, ignoreErrors, name, protected: _protected } = options;

    // Calculate the expiration date
    let expiresAt: string | undefined;
    if (expiresInDays) {
      const expiresAtDate = new Date();
      expiresAtDate.setDate(expiresAtDate.getDate() + expiresInDays);
      expiresAt = expiresAtDate.toISOString();
    }
    // Validate the app ID
    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizationId = await promptOrganizationSelection();
      appId = await promptAppSelection(organizationId);
    }
    // Validate the channel name
    if (!name) {
      if (!isInteractive()) {
        consola.error('You must provide the channel name when running in non-interactive environment.');
        process.exit(1);
      }
      name = await prompt('Enter the name of the channel:', { type: 'text' });
    }
    try {
      const response = await appChannelsService.create({
        appId,
        protected: _protected,
        name,
        expiresAt,
      });
      consola.info(`Channel ID: ${response.id}`);
      consola.success('Channel created successfully.');
    } catch (error) {
      if (ignoreErrors) {
        const message = getMessageFromUnknownError(error);
        consola.error(message);
        process.exit(0);
      } else {
        throw error;
      }
    }
  }),
});
