import appBuildsService from '@/services/app-builds.js';
import { getAppBuildShareUrls } from '@/utils/app-build-shares.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Create a public share link for an app build.',
  options: defineOptions(
    z.object({
      appId: z
        .uuid({
          message: 'App ID must be a UUID.',
        })
        .optional()
        .describe('App ID the build belongs to.'),
      buildId: z
        .uuid({
          message: 'Build ID must be a UUID.',
        })
        .optional()
        .describe('Build ID to share.'),
      buildNumber: z.string().optional().describe('Build number to share (e.g., "1", "42").'),
      description: z.string().optional().describe('Additional information for testers, e.g. what to test.'),
      expiresInDays: z.coerce
        .number()
        .int()
        .min(1, {
          message: 'Expires in days must be a positive integer.',
        })
        .optional()
        .describe('Number of days until the share link expires.'),
      json: z.boolean().optional().describe('Output in JSON format.'),
    }),
  ),
  action: withAuth(async (options) => {
    let { appId, buildId } = options;
    const { buildNumber, description, expiresInDays, json } = options;

    // Prompt for app ID if not provided
    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizationId = await promptOrganizationSelection();
      appId = await promptAppSelection(organizationId);
    }

    // Convert build number to build ID if provided
    if (!buildId && buildNumber) {
      const builds = await appBuildsService.findAll({ appId, numberAsString: buildNumber });
      if (builds.length === 0) {
        consola.error(`Build #${buildNumber} not found.`);
        process.exit(1);
      }
      buildId = builds[0]?.id;
    }

    // Prompt for build ID if not provided
    if (!buildId) {
      if (!isInteractive()) {
        consola.error('You must provide a build ID when running in non-interactive environment.');
        process.exit(1);
      }
      const builds = await appBuildsService.findAll({ appId });
      if (builds.length === 0) {
        consola.error('No builds found for this app.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      buildId = await prompt('Select the build you want to share:', {
        type: 'select',
        options: builds.map((build) => ({
          label: `Build #${build.numberAsString || build.id} (${build.platform} - ${build.type})`,
          value: build.id,
        })),
      });
      if (!buildId) {
        consola.error('You must select a build to share.');
        process.exit(1);
      }
    }

    // Ensure the build has succeeded before creating a share
    const build = await appBuildsService.findOne({ appId, appBuildId: buildId, relations: 'job' });
    if (build.job?.status !== 'succeeded') {
      consola.error('The build has not succeeded yet. Only successful builds can be shared.');
      process.exit(1);
    }

    // Compute the expiration date if provided
    const expiresAt =
      expiresInDays !== undefined
        ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
        : undefined;

    const share = await appBuildsService.createShare({ appId, appBuildId: buildId, description, expiresAt });
    const { qrCodeUrl, webUrl } = await getAppBuildShareUrls(share.id);

    if (json) {
      console.log(JSON.stringify({ id: share.id, qrCodeUrl, webUrl, expiresAt: share.expiresAt }, null, 2));
    } else {
      consola.success('Build shared successfully.');
      consola.info(`Share URL: ${webUrl}`);
      consola.info(`QR Code URL: ${qrCodeUrl}`);
      if (share.expiresAt) {
        consola.info(`Expires At: ${share.expiresAt}`);
      }
    }
  }),
});
