import appDestinationsService from '@/services/app-destinations.js';
import { withAuth } from '@/utils/auth.js';
import { clearableStringOption, parseListOption } from '@/utils/cli-options.js';
import { isInteractive } from '@/utils/environment.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import consola from 'consola';
import { z } from 'zod';
import { defineCommand, defineOptions } from 'zodline';

export default defineCommand({
  description: 'Update an existing app destination.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      destinationId: z.string().optional().describe('ID of the destination.'),
      name: z.string().optional().describe('Name of the destination.'),
      appleId: z.string().optional().describe('Apple ID for the destination.'),
      appleAppId: z.string().optional().describe('Apple App ID for the destination.'),
      appleTeamId: z.string().optional().describe('Apple Team ID for the destination.'),
      appleAppPassword: z.string().optional().describe('Apple app-specific password for the destination.'),
      appleApiKeyId: z.string().optional().describe('Apple API Key ID for the destination.'),
      appleIssuerId: z.string().optional().describe('Apple Issuer ID for the destination.'),
      appAppleApiKeyId: z.string().optional().describe('App Apple API Key ID for the destination.'),
      appleBetaGroup: z
        .array(z.string())
        .optional()
        .describe(
          'Name of an external TestFlight beta group to distribute to. Can be specified multiple times or comma-separated. Pass `--apple-beta-group=` to remove all groups.',
        ),
      appleSubmitForReview: z
        .union([z.boolean(), z.stringbool()], {
          message: 'Apple submit for review must be either `true` or `false`.',
        })
        .optional()
        .describe('Submit the build for App Review after the upload (App Store Connect only, requires an API key).'),
      appleReleaseType: z
        .enum(['after-approval', 'manual'])
        .optional()
        .describe('Release type of the App Store version after approval (App Store Connect only).'),
      appleRejectIfPossible: z
        .union([z.boolean(), z.stringbool()], {
          message: 'Apple reject if possible must be either `true` or `false`.',
        })
        .optional()
        .describe('Cancel a submission waiting for review before submitting the new build (App Store Connect only).'),
      androidPackageName: z.string().optional().describe('Android package name for the destination.'),
      androidBuildArtifactType: z.enum(['aab', 'apk']).optional().describe('Android build artifact type (aab, apk).'),
      androidReleaseStatus: z
        .enum(['completed', 'draft'])
        .optional()
        .describe('Android release status (completed, draft).'),
      appGoogleServiceAccountKeyId: z
        .string()
        .optional()
        .describe('App Google Service Account Key ID for the destination.'),
      googlePlayTrack: z.string().optional().describe('Google Play track for the destination.'),
      firebaseAppId: z.string().optional().describe('Firebase app ID for the destination.'),
      firebaseTesterGroup: z
        .array(z.string())
        .optional()
        .describe(
          'The alias of a Firebase tester group to distribute to. Can be specified multiple times or comma-separated. Pass `--firebase-tester-group=` to remove all groups.',
        ),
      huaweiAppId: z.string().optional().describe('Huawei AppGallery app ID for the destination.'),
      huaweiClientId: z.string().optional().describe('Huawei AppGallery Connect API client ID for the destination.'),
      huaweiClientSecret: z
        .string()
        .optional()
        .describe('Huawei AppGallery Connect API client secret for the destination.'),
      defaultLanguage: clearableStringOption.describe(
        'Language of the default release notes text, e.g. `en-US` (Google Play and Huawei AppGallery only). Pass `--default-language=` to clear it.',
      ),
    }),
  ),
  action: withAuth(async (options, args) => {
    let {
      appId,
      destinationId,
      name,
      appleId,
      appleAppId,
      appleTeamId,
      appleAppPassword,
      appleApiKeyId,
      appleIssuerId,
      appAppleApiKeyId,
      appleBetaGroup,
      appleSubmitForReview,
      appleReleaseType,
      appleRejectIfPossible,
      androidPackageName,
      androidBuildArtifactType,
      androidReleaseStatus,
      appGoogleServiceAccountKeyId,
      googlePlayTrack,
      firebaseAppId,
      firebaseTesterGroup,
      huaweiAppId,
      huaweiClientId,
      huaweiClientSecret,
      defaultLanguage,
    } = options;

    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizationId = await promptOrganizationSelection();
      appId = await promptAppSelection(organizationId);
    }
    if (!destinationId) {
      if (!isInteractive()) {
        consola.error('You must provide the destination ID when running in non-interactive environment.');
        process.exit(1);
      }
      destinationId = await prompt('Enter the destination ID:', { type: 'text' });
    }

    await appDestinationsService.update({
      appId,
      destinationId,
      name,
      appleId,
      appleAppId,
      appleTeamId,
      appleAppPassword,
      appleApiKeyId,
      appleIssuerId,
      appAppleApiKeyId,
      appleBetaGroups: parseListOption(appleBetaGroup),
      appleRejectIfPossible,
      appleReleaseType,
      appleSubmitForReview,
      androidPackageName,
      androidBuildArtifactType,
      androidReleaseStatus,
      appGoogleServiceAccountKeyId,
      googlePlayTrack,
      firebaseAppId,
      firebaseTesterGroups: parseListOption(firebaseTesterGroup),
      huaweiAppId,
      huaweiClientId,
      huaweiClientSecret,
      defaultLanguage,
    });
    consola.success('Destination updated successfully.');
  }),
});
