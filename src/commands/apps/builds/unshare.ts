import appBuildsService from '@/services/app-builds.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Revoke the public share link of an app build.',
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
        .describe('Build ID to unshare.'),
      buildNumber: z.string().optional().describe('Build number to unshare (e.g., "1", "42").'),
      yes: z.boolean().optional().describe('Skip confirmation prompt.'),
    }),
    { y: 'yes' },
  ),
  action: withAuth(async (options) => {
    let { appId, buildId } = options;
    const { buildNumber } = options;

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
      buildId = await prompt('Select the build you want to unshare:', {
        type: 'select',
        options: builds.map((build) => ({
          label: `Build #${build.numberAsString || build.id} (${build.platform} - ${build.type})`,
          value: build.id,
        })),
      });
      if (!buildId) {
        consola.error('You must select a build to unshare.');
        process.exit(1);
      }
    }

    // Find the active share
    const shares = await appBuildsService.findAllShares({ appId, appBuildId: buildId });
    const share = shares[0];
    if (!share) {
      consola.error('This build is not shared.');
      process.exit(1);
    }

    // Confirm revocation
    if (!options.yes && isInteractive()) {
      const confirmed = await prompt('Are you sure you want to revoke the share link for this build?', {
        type: 'confirm',
      });
      if (!confirmed) {
        return;
      }
    }

    // Revoke the share
    await appBuildsService.deleteShare({ appId, appBuildId: buildId, id: share.id });
    consola.success('Share revoked successfully.');
  }),
});
