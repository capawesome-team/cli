import appCertificatesService from '@/services/app-certificates.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Retrieve a list of existing app certificates.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      json: z.boolean().optional().describe('Output in JSON format.'),
      limit: z.coerce.number().optional().describe('Limit for pagination.'),
      offset: z.coerce.number().optional().describe('Offset for pagination.'),
      platform: z.enum(['android', 'ios', 'web']).optional().describe('Filter by platform.'),
      type: z.enum(['development', 'production']).optional().describe('Filter by type.'),
    }),
  ),
  action: withAuth(async (options, args) => {
    let { appId, json, limit, offset, platform, type } = options;

    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizationId = await promptOrganizationSelection();
      appId = await promptAppSelection(organizationId);
    }

    const certificates = await appCertificatesService.findAll({
      appId,
      limit,
      offset,
      platform,
      type,
    });
    if (json) {
      console.log(JSON.stringify(certificates, null, 2));
    } else {
      console.table(certificates);
      consola.success('Certificates retrieved successfully.');
    }
  }),
});
