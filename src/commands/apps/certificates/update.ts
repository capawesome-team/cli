import appCertificatesService from '@/services/app-certificates.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Update an existing app certificate.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      certificateId: z.string().optional().describe('ID of the certificate.'),
      keyAlias: z.string().optional().describe('Key alias for the certificate.'),
      keyPassword: z.string().optional().describe('Key password for the certificate.'),
      name: z.string().optional().describe('Name of the certificate.'),
      password: z.string().optional().describe('Password for the certificate.'),
      type: z
        .enum(['development', 'production'])
        .optional()
        .describe('Type of the certificate (development, production).'),
    }),
  ),
  action: withAuth(async (options, args) => {
    let { appId, certificateId, keyAlias, keyPassword, name, password, type } = options;

    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizationId = await promptOrganizationSelection();
      appId = await promptAppSelection(organizationId);
    }
    if (!certificateId) {
      if (!isInteractive()) {
        consola.error('You must provide the certificate ID when running in non-interactive environment.');
        process.exit(1);
      }
      certificateId = await prompt('Enter the certificate ID:', { type: 'text' });
    }

    await appCertificatesService.update({
      appId,
      certificateId,
      name,
      type,
      password,
      keyAlias,
      keyPassword,
    });
    consola.success('Certificate updated successfully.');
  }),
});
