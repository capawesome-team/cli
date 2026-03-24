import appCertificatesService from '@/services/app-certificates.js';
import appProvisioningProfilesService from '@/services/app-provisioning-profiles.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { prompt, promptAppSelection, promptOrganizationSelection } from '@/utils/prompt.js';
import { defineCommand, defineOptions } from '@robingenz/zli';
import consola from 'consola';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';

export default defineCommand({
  description: 'Create a new app certificate.',
  options: defineOptions(
    z.object({
      appId: z.string().optional().describe('ID of the app.'),
      file: z.string().optional().describe('Path to the certificate file.'),
      keyAlias: z.string().optional().describe('Key alias for the certificate.'),
      keyPassword: z.string().optional().describe('Key password for the certificate.'),
      name: z.string().optional().describe('Name of the certificate.'),
      password: z.string().optional().describe('Password for the certificate.'),
      platform: z
        .enum(['android', 'ios', 'web'])
        .optional()
        .describe('Platform of the certificate (android, ios, web).'),
      provisioningProfile: z
        .array(z.string())
        .optional()
        .describe('Paths to provisioning profile files to upload and link.'),
      type: z
        .enum(['development', 'production'])
        .optional()
        .describe('Type of the certificate (development, production).'),
      yes: z.boolean().optional().describe('Skip confirmation prompts.'),
    }),
    { y: 'yes' },
  ),
  action: withAuth(async (options, args) => {
    let { appId, file, keyAlias, keyPassword, name, password, platform, provisioningProfile, type } = options;

    // 1. Select organization and app
    if (!appId) {
      if (!isInteractive()) {
        consola.error('You must provide an app ID when running in non-interactive environment.');
        process.exit(1);
      }
      const organizationId = await promptOrganizationSelection();
      appId = await promptAppSelection(organizationId);
    }
    // 2. Enter certificate name
    if (!name) {
      if (!isInteractive()) {
        consola.error('You must provide the certificate name when running in non-interactive environment.');
        process.exit(1);
      }
      name = await prompt('Enter the name of the certificate:', { type: 'text' });
      if (!name) {
        consola.error('You must provide a certificate name.');
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
          { label: 'Web', value: 'web' },
        ],
      });
      if (!platform) {
        consola.error('You must select a platform.');
        process.exit(1);
      }
    }
    // 4. Warn if deprecated --type option is used
    if (type) {
      consola.warn(
        'The --type option is deprecated and will be removed in a future version. The certificate type is now detected automatically.',
      );
    }
    // 5. Enter certificate file path
    if (!file) {
      if (!isInteractive()) {
        consola.error('You must provide a certificate file path when running in non-interactive environment.');
        process.exit(1);
      }
      file = await prompt('Enter the path to the certificate file:', { type: 'text' });
      if (!file) {
        consola.error('You must provide a certificate file path.');
        process.exit(1);
      }
    }
    // 6. Enter certificate password (required for android/ios)
    if (!password && (platform === 'android' || platform === 'ios')) {
      if (!isInteractive()) {
        consola.error('You must provide the certificate password when running in non-interactive environment.');
        process.exit(1);
      }
      password = await prompt('Enter the certificate password:', { type: 'text' });
      if (!password) {
        consola.error('You must provide a certificate password.');
        process.exit(1);
      }
    }
    // 7. If Android, ask for key alias (required)
    if (!keyAlias && platform === 'android') {
      if (!isInteractive()) {
        consola.error('You must provide the key alias when running in non-interactive environment.');
        process.exit(1);
      }
      keyAlias = await prompt('Enter the key alias:', { type: 'text' });
      if (!keyAlias) {
        consola.error('You must provide a key alias.');
        process.exit(1);
      }
    }
    // 8. If Android, ask for key password (optional, skip with --yes)
    if (!keyPassword && platform === 'android' && !options.yes && isInteractive()) {
      keyPassword = await prompt('Enter the key password (leave empty if none):', { type: 'text' });
      if (!keyPassword) {
        keyPassword = undefined;
      }
    }
    // 9. If iOS, ask for provisioning profile file path (optional, skip with --yes)
    if (!provisioningProfile && platform === 'ios' && !options.yes && isInteractive()) {
      const profilePath = await prompt('Enter the path to the provisioning profile file (leave empty to skip):', {
        type: 'text',
      });
      if (profilePath) {
        provisioningProfile = [profilePath];
      }
    }

    const buffer = fs.readFileSync(file);
    const fileName = path.basename(file);

    // Upload provisioning profiles first
    const provisioningProfileIds: string[] = [];
    if (provisioningProfile && provisioningProfile.length > 0) {
      for (const profilePath of provisioningProfile) {
        const profileBuffer = fs.readFileSync(profilePath);
        const profileFileName = path.basename(profilePath);
        const profile = await appProvisioningProfilesService.create({
          appId,
          buffer: profileBuffer,
          fileName: profileFileName,
        });
        provisioningProfileIds.push(profile.id);
      }
    }

    const certificate = await appCertificatesService.create({
      appId,
      buffer,
      fileName,
      name,
      platform: platform!,
      password,
      keyAlias,
      keyPassword,
    });

    // Link provisioning profiles to the certificate
    if (provisioningProfileIds.length > 0) {
      await appProvisioningProfilesService.updateMany({
        appId,
        ids: provisioningProfileIds,
        appCertificateId: certificate.id,
      });
    }

    consola.info(`Certificate ID: ${certificate.id}`);
    consola.success('Certificate created successfully.');
  }),
});
