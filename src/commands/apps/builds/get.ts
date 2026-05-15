import appBuildsService from '@/services/app-builds.js';
import { withAuth } from '@/utils/auth.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import { z } from 'zod';

export default defineCommand({
  description: 'Get an existing app build.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      buildId: z.string().optional().describe('ID of the build.'),
      json: z.boolean().optional().describe('Output in JSON format.'),
    }),
  ),
  action: withAuth(async (options, args) => {
    const { appId, buildId, json } = options;

    if (!appId) {
      consola.error('You must provide an app ID.');
      process.exit(1);
    }
    if (!buildId) {
      consola.error('You must provide a build ID.');
      process.exit(1);
    }

    const build = await appBuildsService.findOne({
      appId,
      appBuildId: buildId,
      relations: json ? 'job' : undefined,
    });
    if (json) {
      console.log(JSON.stringify(build, null, 2));
    } else {
      console.table(build);
      consola.success('Build retrieved successfully.');
    }
  }),
});
