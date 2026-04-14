import appAppleApiKeysService from '@/services/app-apple-api-keys.js';
import appDestinationsService from '@/services/app-destinations.js';
import appGoogleServiceAccountKeysService from '@/services/app-google-service-account-keys.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { fileExistsAtPath } from '@/utils/file.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';

export default defineCommand({
  description: 'Create a new app destination.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      name: z.string().optional().describe('Name of the destination.'),
      platform: z.enum(['android', 'ios']).optional().describe('Platform of the destination (android, ios).'),
      appleId: z.string().optional().describe('Apple ID for the destination.'),
      appleAppId: z.string().optional().describe('Apple App ID for the destination.'),
      appleTeamId: z.string().optional().describe('Apple Team ID for the destination.'),
      appleAppPassword: z.string().optional().describe('Apple app-specific password for the destination.'),
      appleApiKeyFile: z.string().optional().describe('Path to the Apple API key (.p8) file.'),
      appleIssuerId: z.string().optional().describe('Apple Issuer ID for the destination.'),
      androidPackageName: z.string().optional().describe('Android package name for the destination.'),
      androidBuildArtifactType: z.enum(['aab', 'apk']).optional().describe('Android build artifact type (aab, apk).'),
      androidReleaseStatus: z
        .enum(['completed', 'draft'])
        .optional()
        .describe('Android release status (completed, draft).'),
      googleServiceAccountKeyFile: z.string().optional().describe('Path to the Google service account key JSON file.'),
      googlePlayTrack: z.string().optional().describe('Google Play track for the destination.'),
    }),
  ),
  action: withAuth(async (options, args) => {
    let {
      appId,
      name,
      platform,
      appleId,
      appleAppId,
      appleTeamId,
      appleAppPassword,
      appleApiKeyFile,
      appleIssuerId,
      androidPackageName,
      androidBuildArtifactType,
      androidReleaseStatus,
      googleServiceAccountKeyFile,
      googlePlayTrack,
    } = options;
    let appleApiKeyId: string | undefined;
    let appAppleApiKeyId: string | undefined;
    let appGoogleServiceAccountKeyId: string | undefined;

    // 1. Select organization and app
    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizationId = await promptOrganizationSelection();
      appId = await promptAppSelection(organizationId);
    }
    // 2. Enter destination name
    if (!name) {
      if (!isInteractive()) {
        consola.error('You must provide the destination name when running in non-interactive environment.');
        process.exit(1);
      }
      name = await prompt('Enter the name of the destination:', { type: 'text' });
      if (!name) {
        consola.error('You must provide a destination name.');
        process.exit(1);
      }
    }
    // 3. Select platform
    if (!platform) {
      if (!isInteractive()) {
        consola.error('You must provide the platform when running in non-interactive environment.');
        process.exit(1);
      }
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      platform = await prompt('Select the platform:', {
        type: 'select',
        options: [
          { label: 'Android', value: 'android' },
          { label: 'iOS', value: 'ios' },
        ],
      });
      if (!platform) {
        consola.error('You must select a platform.');
        process.exit(1);
      }
    }

    if (platform === 'android') {
      // 4. Ask for track
      if (!googlePlayTrack) {
        if (!isInteractive()) {
          consola.error('You must provide the Google Play track when running in non-interactive environment.');
          process.exit(1);
        }
        googlePlayTrack = await prompt('Enter the Google Play track:', { type: 'text' });
        if (!googlePlayTrack) {
          consola.error('You must provide a Google Play track.');
          process.exit(1);
        }
      }
      // 5. Ask for package name
      if (!androidPackageName) {
        if (!isInteractive()) {
          consola.error('You must provide the Android package name when running in non-interactive environment.');
          process.exit(1);
        }
        androidPackageName = await prompt('Enter the Android package name:', { type: 'text' });
        if (!androidPackageName) {
          consola.error('You must provide an Android package name.');
          process.exit(1);
        }
      }
      // 6. Ask for publishing format
      if (!androidBuildArtifactType) {
        if (!isInteractive()) {
          consola.error(
            'You must provide the Android build artifact type when running in non-interactive environment.',
          );
          process.exit(1);
        }
        // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
        androidBuildArtifactType = await prompt('Select the publishing format:', {
          type: 'select',
          options: [
            { label: 'AAB', value: 'aab' },
            { label: 'APK', value: 'apk' },
          ],
        });
        if (!androidBuildArtifactType) {
          consola.error('You must select a publishing format.');
          process.exit(1);
        }
      }
      // 7. Ask for release status
      if (!androidReleaseStatus) {
        if (!isInteractive()) {
          consola.error('You must provide the Android release status when running in non-interactive environment.');
          process.exit(1);
        }
        // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
        androidReleaseStatus = await prompt('Select the release status:', {
          type: 'select',
          options: [
            { label: 'Draft', value: 'draft' },
            { label: 'Completed', value: 'completed' },
          ],
        });
        if (!androidReleaseStatus) {
          consola.error('You must select a release status.');
          process.exit(1);
        }
      }
      // 8. Ask for JSON key path
      if (!googleServiceAccountKeyFile) {
        if (!isInteractive()) {
          consola.error(
            'You must provide the Google service account key file when running in non-interactive environment.',
          );
          process.exit(1);
        }
        googleServiceAccountKeyFile = await prompt('Enter the path to the Google service account key JSON file:', {
          type: 'text',
        });
        if (!googleServiceAccountKeyFile) {
          consola.error('You must provide a Google service account key file path.');
          process.exit(1);
        }
      }
      // Upload Google service account key file
      const googleServiceAccountKeyFileExists = await fileExistsAtPath(googleServiceAccountKeyFile);
      if (!googleServiceAccountKeyFileExists) {
        consola.error(
          `The Google service account key file was not found or is not accessible: ${googleServiceAccountKeyFile}`,
        );
        process.exit(1);
      }
      const buffer = fs.readFileSync(googleServiceAccountKeyFile);
      const fileName = path.basename(googleServiceAccountKeyFile);
      const key = await appGoogleServiceAccountKeysService.create({
        appId,
        buffer,
        fileName,
      });
      appGoogleServiceAccountKeyId = key.id;
    }

    if (platform === 'ios') {
      // 9. Ask for authentication method
      let authMethod: string | undefined;
      if (appleApiKeyFile || appleIssuerId) {
        authMethod = 'apiKey';
      } else if (appleId || appleAppId || appleAppPassword) {
        authMethod = 'password';
      } else if (isInteractive()) {
        // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
        authMethod = await prompt('Select the authentication method:', {
          type: 'select',
          options: [
            { label: 'API Key', value: 'apiKey' },
            { label: 'Password', value: 'password' },
          ],
        });
        if (!authMethod) {
          consola.error('You must select an authentication method.');
          process.exit(1);
        }
      } else {
        consola.error(
          'You must provide authentication options when running in non-interactive environment. Either pass --apple-api-key-file and --apple-issuer-id for API Key authentication or --apple-id, --apple-app-id, and --apple-app-password for Password authentication.',
        );
        process.exit(1);
      }

      if (authMethod === 'apiKey') {
        // 10. Ask for p8 key file path
        if (!appleApiKeyFile) {
          if (!isInteractive()) {
            consola.error('You must provide the Apple API key file when running in non-interactive environment.');
            process.exit(1);
          }
          appleApiKeyFile = await prompt('Enter the path to the Apple API key (.p8) file:', {
            type: 'text',
          });
          if (!appleApiKeyFile) {
            consola.error('You must provide an Apple API key file path.');
            process.exit(1);
          }
        }
        // Upload Apple API key file
        const appleApiKeyFileExists = await fileExistsAtPath(appleApiKeyFile);
        if (!appleApiKeyFileExists) {
          consola.error(`The Apple API key file was not found or is not accessible: ${appleApiKeyFile}`);
          process.exit(1);
        }
        const buffer = fs.readFileSync(appleApiKeyFile);
        const fileName = path.basename(appleApiKeyFile);
        const key = await appAppleApiKeysService.create({
          appId,
          buffer,
          fileName,
        });
        appAppleApiKeyId = key.id;
        // 11. Ask for key ID
        if (!appleApiKeyId) {
          if (!isInteractive()) {
            consola.error('You must provide the Apple API Key ID when running in non-interactive environment.');
            process.exit(1);
          }
          appleApiKeyId = await prompt('Enter the Apple API Key ID:', { type: 'text' });
          if (!appleApiKeyId) {
            consola.error('You must provide an Apple API Key ID.');
            process.exit(1);
          }
        }
        // 12. Ask for issuer ID
        if (!appleIssuerId) {
          if (!isInteractive()) {
            consola.error('You must provide the Apple Issuer ID when running in non-interactive environment.');
            process.exit(1);
          }
          appleIssuerId = await prompt('Enter the Apple Issuer ID:', { type: 'text' });
          if (!appleIssuerId) {
            consola.error('You must provide an Apple Issuer ID.');
            process.exit(1);
          }
        }
      } else if (authMethod === 'password') {
        // 13. Ask for Apple ID
        if (!appleId) {
          if (!isInteractive()) {
            consola.error('You must provide the Apple ID when running in non-interactive environment.');
            process.exit(1);
          }
          appleId = await prompt('Enter the Apple ID:', { type: 'text' });
          if (!appleId) {
            consola.error('You must provide an Apple ID.');
            process.exit(1);
          }
        }
        // 14. Ask for Apple App ID
        if (!appleAppId) {
          if (!isInteractive()) {
            consola.error('You must provide the Apple App ID when running in non-interactive environment.');
            process.exit(1);
          }
          appleAppId = await prompt('Enter the Apple App ID:', { type: 'text' });
          if (!appleAppId) {
            consola.error('You must provide an Apple App ID.');
            process.exit(1);
          }
        }
        // 15. Ask for App-specific password
        if (!appleAppPassword) {
          if (!isInteractive()) {
            consola.error('You must provide the App-specific password when running in non-interactive environment.');
            process.exit(1);
          }
          appleAppPassword = await prompt('Enter the App-specific password:', { type: 'text' });
          if (!appleAppPassword) {
            consola.error('You must provide an App-specific password.');
            process.exit(1);
          }
        }
      }

      // 16. Ask for team ID
      if (!appleTeamId) {
        if (!isInteractive()) {
          consola.error('You must provide the Apple Team ID when running in non-interactive environment.');
          process.exit(1);
        }
        appleTeamId = await prompt('Enter the Apple Team ID:', { type: 'text' });
        if (!appleTeamId) {
          consola.error('You must provide an Apple Team ID.');
          process.exit(1);
        }
      }
    }

    const response = await appDestinationsService.create({
      appId,
      name,
      platform: platform!,
      appleId,
      appleAppId,
      appleTeamId,
      appleAppPassword,
      appleApiKeyId,
      appleIssuerId,
      appAppleApiKeyId,
      androidPackageName,
      androidBuildArtifactType,
      androidReleaseStatus,
      appGoogleServiceAccountKeyId,
      googlePlayTrack,
    });
    consola.info(`Destination ID: ${response.id}`);
    consola.success('Destination created successfully.');
  }),
});
