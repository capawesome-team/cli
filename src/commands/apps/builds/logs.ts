import appBuildsService from '@/services/app-builds.js';
import appsService from '@/services/apps.js';
import authorizationService from '@/services/authorization-service.js';
import organizationsService from '@/services/organizations.js';
import { unescapeAnsi } from '@/utils/ansi.js';
import { prompt } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { hasTTY } from 'std-env';
import { z } from 'zod';

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export default defineCommand({
  description: 'Show logs of an app build.',
  options: defineOptions(
    z.object({
      appId: z
        .uuid({
          message: 'App ID must be a UUID.',
        })
        .optional()
        .describe('App ID to display the build logs for.'),
      buildId: z
        .uuid({
          message: 'Build ID must be a UUID.',
        })
        .optional()
        .describe('Build ID to display the build logs for.'),
    }),
  ),
  action: async (options) => {
    let { appId, buildId } = options;

    // Check if the user is logged in
    if (!authorizationService.hasAuthorizationToken()) {
      consola.error('You must be logged in to run this command.');
      process.exit(1);
    }

    // Prompt for app ID if not provided
    if (!appId) {
      if (!hasTTY) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizations = await organizationsService.findAll();
      if (organizations.length === 0) {
        consola.error('You must create an organization before viewing build logs.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      const organizationId = await prompt('Select the organization of the app for which you want to view the build logs.', {
        type: 'select',
        options: organizations.map((organization) => ({ label: organization.name, value: organization.id })),
      });
      if (!organizationId) {
        consola.error('You must select the organization of an app for which you want to view the build logs.');
        process.exit(1);
      }
      const apps = await appsService.findAll({
        organizationId,
      });
      if (apps.length === 0) {
        consola.error('You must create an app before viewing build logs.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      appId = await prompt('Which app do you want to view the build logs for:', {
        type: 'select',
        options: apps.map((app) => ({ label: app.name, value: app.id })),
      });
      if (!appId) {
        consola.error('You must select an app to view the build logs.');
        process.exit(1);
      }
    }

    // Prompt for platform if not provided
    if (!buildId) {
      if (!hasTTY) {
        consola.error('You must provide a platform when running in non-interactive environment.');
        process.exit(1);
      }
      const appBuilds = await appBuildsService.findAll({ appId })
      if (appBuilds.length === 0) {
        consola.error('You must create a build before viewing the logs.');
        process.exit(1);
      }
      buildId = await prompt('Select the build of the app for which you want to view the logs.', {
        type: 'select',
        options: appBuilds.map((appBuild) => ({ label: appBuild.id, value: appBuild.id })),
      });
      if (!buildId) {
        consola.error('You must select the build of an app for which you want to view the logs.');
        process.exit(1);
      }
    }
    console.log(`Fetching logs for build ${buildId} of app ${appId}...`);

    const appBuildDto = await appBuildsService.findOne({ appId, appBuildId: buildId!, relations: 'job,job.jobLogs' })
    for (const logEntry of appBuildDto.job?.jobLogs || []) {
      console.log(`${logEntry.number.toString().padStart(4, '0')} ${formatDate(new Date(logEntry.timestamp))} ${unescapeAnsi(logEntry.payload)}`);
    }
  },
});
