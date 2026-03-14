import appCertificatesService from '@/services/app-certificates.js';
import { withAuth } from '@/utils/auth.js';
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
    }),
  ),
  action: withAuth(async (options, args) => {
    const { appId, certificateId, json } = options;

    if (!appId) {
      consola.error('You must provide an app ID.');
      process.exit(1);
    }
    if (!certificateId) {
      consola.error('You must provide a certificate ID.');
      process.exit(1);
    }

    const certificate = await appCertificatesService.findOneById({
      appId,
      certificateId,
    });
    if (json) {
      console.log(JSON.stringify(certificate, null, 2));
    } else {
      console.table(certificate);
      consola.success('Certificate retrieved successfully.');
    }
  }),
});
