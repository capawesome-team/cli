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
      name: z.string().optional().describe('Name of the certificate.'),
      platform: z
        .enum(['android', 'ios', 'web'])
        .optional()
        .describe('Platform of the certificate (android, ios, web).'),
      yes: z.boolean().optional().describe('Skip confirmation prompt.'),
    }),
    { y: 'yes' },
  ),
  action: withAuth(async (options, args) => {
    let { appId, certificateId, name, platform } = options;

    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizationId = await promptOrganizationSelection();
      appId = await promptAppSelection(organizationId);
    }
    if (!certificateId) {
      if (name && platform) {
        const certificates = await appCertificatesService.findAll({ appId, name, platform });
        const firstCertificate = certificates[0];
        if (!firstCertificate) {
          consola.error(`No certificate found with name '${name}' and platform '${platform}'.`);
          process.exit(1);
        }
        certificateId = firstCertificate.id;
      } else if (isInteractive()) {
        if (!platform) {
          // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
          platform = await prompt('Select the platform:', {
            type: 'select',
            options: [
              { label: 'Android', value: 'android' },
              { label: 'iOS', value: 'ios' },
              { label: 'Web', value: 'web' },
            ],
          });
        }
        const certificates = await appCertificatesService.findAll({ appId, platform });
        if (!certificates.length) {
          consola.error('No certificates found for this app. Create one first.');
          process.exit(1);
        }
        // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
        certificateId = await prompt('Select the certificate to delete:', {
          type: 'select',
          options: certificates.map((cert) => ({ label: cert.name, value: cert.id })),
        });
      } else {
        consola.error(
          'You must provide the certificate ID or --name and --platform when running in non-interactive environment.',
        );
        process.exit(1);
      }
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
