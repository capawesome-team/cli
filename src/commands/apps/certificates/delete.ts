import appCertificatesService from '@/services/app-certificates.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Delete an app certificate.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      certificateId: z.string().optional().describe('ID of the certificate.'),
      yes: z.boolean().optional().describe('Skip confirmation prompt.'),
    }),
    { y: 'yes' },
  ),
  action: withAuth(async (options, args) => {
    let { appId, certificateId } = options;

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
      const certificates = await appCertificatesService.findAll({ appId });
      if (!certificates.length) {
        consola.error('No certificates found for this app. Create one first.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      certificateId = await prompt('Select the certificate to delete:', {
        type: 'select',
        options: certificates.map((cert) => ({ label: cert.name, value: cert.id })),
      });
    }
    if (!options.yes && isInteractive()) {
      const confirmed = await prompt('Are you sure you want to delete this certificate?', {
        type: 'confirm',
      });
      if (!confirmed) {
        return;
      }
    }

    await appCertificatesService.delete({ appId, certificateId });
    consola.success('Certificate deleted successfully.');
  }),
});
