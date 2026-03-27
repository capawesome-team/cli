import appCertificatesService from '@/services/app-certificates.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Get an existing app certificate.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      certificateId: z.string().optional().describe('ID of the certificate.'),
      json: z.boolean().optional().describe('Output in JSON format.'),
      name: z.string().optional().describe('Name of the certificate.'),
      platform: z
        .enum(['android', 'ios', 'web'])
        .optional()
        .describe('Platform of the certificate (android, ios, web).'),
      type: z
        .enum(['development', 'production'])
        .optional()
        .describe('Type of the certificate (development, production).'),
    }),
  ),
  action: withAuth(async (options, args) => {
    let { appId, certificateId, name, platform, type } = options;

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
        const certificates = await appCertificatesService.findAll({ appId, name, platform, type });
        const firstCertificate = certificates[0];
        if (!firstCertificate) {
          if (type) {
            consola.error(`No certificate found with name '${name}', platform '${platform}', and type '${type}'.`);
          } else {
            consola.error(`No certificate found with name '${name}' and platform '${platform}'.`);
          }
          process.exit(1);
        }
        if (certificates.length > 1 && !type) {
          consola.error(
            `Multiple certificates found with name '${name}' and platform '${platform}'. Please specify --type or --certificate-id to disambiguate.`,
          );
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
        if (!type) {
          // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
          type = await prompt('Select the type:', {
            type: 'select',
            options: [
              { label: 'Development', value: 'development' },
              { label: 'Production', value: 'production' },
            ],
          });
        }
        const certificates = await appCertificatesService.findAll({ appId, name, platform, type });
        if (!certificates.length) {
          consola.error(`No certificates found with platform '${platform}' and type '${type}'. Create one first.`);
          process.exit(1);
        }
        // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
        certificateId = await prompt('Select the certificate:', {
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

    const certificate = await appCertificatesService.findOneById({
      appId,
      certificateId,
    });
    if (options.json) {
      console.log(JSON.stringify(certificate, null, 2));
    } else {
      console.table(certificate);
      consola.success('Certificate retrieved successfully.');
    }
  }),
});
