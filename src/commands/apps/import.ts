import { DEFAULT_CONSOLE_BASE_URL } from '@/config/consts.js';
import appAutomationsService from '@/services/app-automations.js';
import appCertificatesService from '@/services/app-certificates.js';
import appChannelsService from '@/services/app-channels.js';
import appConfigurationsService from '@/services/app-configurations.js';
import appDestinationsService from '@/services/app-destinations.js';
import appEnvironmentsService from '@/services/app-environments.js';
import appGoogleServiceAccountKeysService from '@/services/app-google-service-account-keys.js';
import appProvisioningProfilesService from '@/services/app-provisioning-profiles.js';
import appsService from '@/services/apps.js';
import gitConnectionsService from '@/services/git-connections.js';
import { AppImport, generateUniqueName, isNameTaken, SkippedAppImport } from '@/utils/app-import.js';
import { parseAppflowExport } from '@/utils/appflow-export.js';
import { withAuth } from '@/utils/auth.js';
import { isInteractive } from '@/utils/environment.js';
import { getMessageFromUnknownError, UserError } from '@/utils/error.js';
import { isReadable } from '@/utils/file.js';
import { prompt, promptOrganizationSelection } from '@/utils/prompt.js';
import zip from '@/utils/zip.js';
import { defineCommand, defineOptions } from 'zodline';
import consola from 'consola';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { z } from 'zod';

const SIGNALS = ['SIGHUP', 'SIGINT', 'SIGTERM'] as const;

// Maps the providers of `parseGitRemoteUrl` to the providers of git connections.
const GIT_CONNECTION_PROVIDERS: Record<string, string> = { azure: 'azure_devops' };

interface AppImportOutcome {
  app: AppImport;
  id?: string;
  errors: string[];
  created: {
    automations: number;
    certificates: number;
    channels: number;
    configurations: number;
    destinations: number;
    environments: number;
  };
}

export default defineCommand({
  description: 'Import apps from an Ionic Appflow export.',
  options: defineOptions(
    z.object({
      dryRun: z.boolean().optional().describe('Preview the import without creating any resources.'),
      file: z.string().optional().describe('Path to the export file (.zip).'),
      include: z
        .array(z.string())
        .optional()
        .describe(
          'Filter which apps to import by name or ID. Can be specified multiple times or comma-separated. Defaults to all apps.',
        ),
      ionicAppType: z
        .enum(['capacitor', 'cordova'], {
          message: 'Ionic app type must be either `capacitor` or `cordova`.',
        })
        .optional()
        .describe(
          'The actual app type of apps exported with the ambiguous app type `ionic`. Prompted for each app if not provided.',
        ),
      json: z.boolean().optional().describe('Output in JSON format.'),
      organizationId: z.string().optional().describe('ID of the organization to import the apps into.'),
    }),
  ),
  action: withAuth(async (options, args) => {
    let { dryRun, file, include, ionicAppType, json, organizationId } = options;

    if (!file) {
      if (!isInteractive()) {
        consola.error('You must provide the export file path when running in non-interactive environment.');
        process.exit(1);
      }
      file = await prompt('Enter the path to the export file (.zip):', { type: 'text' });
      if (!file) {
        consola.error('You must provide an export file path.');
        process.exit(1);
      }
    }
    if (!zip.isZipped(file)) {
      consola.error('The export file must be a `.zip` file.');
      process.exit(1);
    }
    const fileReadable = await isReadable(file);
    if (!fileReadable) {
      consola.error(`The export file does not exist or is not accessible: ${file}`);
      process.exit(1);
    }
    if (!organizationId) {
      if (!isInteractive()) {
        consola.error('You must provide an organization ID when running in non-interactive environment.');
        process.exit(1);
      }
      organizationId = await promptOrganizationSelection({
        message: 'Which organization do you want to import the apps into?',
      });
    }

    const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'capawesome-appflow-import-'));
    // The extracted export contains secrets, so it must also be removed when the
    // process exits via `process.exit` (e.g. a cancelled prompt) or a signal,
    // which would skip the `finally` block.
    const removeTempDirectory = () => fs.rmSync(tempDirectory, { recursive: true, force: true, maxRetries: 3 });
    const handleSignal = (signal: NodeJS.Signals) => {
      removeTempDirectory();
      // Re-raise the signal to keep the default exit code (128 + signal number).
      process.kill(process.pid, signal);
    };
    process.once('exit', removeTempDirectory);
    for (const signal of SIGNALS) {
      process.once(signal, handleSignal);
    }
    try {
      await zip.unzipToFolder(fs.readFileSync(file), tempDirectory);
      const { apps, skippedApps, warnings } = await parseAppflowExport(tempDirectory);
      for (const warning of warnings) {
        consola.warn(warning);
      }
      const { selectedApps, selectedSkippedApps } = await selectApps(apps, skippedApps, include);
      if (selectedApps.length === 0 && selectedSkippedApps.length === 0) {
        throw new UserError('No apps found in the export that match the provided filters.');
      }
      const { resolvedApps, skippedApps: unresolvedApps } = await resolveIonicAppTypes(selectedApps, ionicAppType);
      selectedSkippedApps.push(...unresolvedApps);

      await assignUniqueAppNames(resolvedApps, organizationId);
      const unconnectedGitProviders = await findUnconnectedGitProviders(resolvedApps, organizationId);
      for (const provider of unconnectedGitProviders) {
        const appCount = resolvedApps.filter((app) => app.repository?.provider === provider).length;
        consola.warn(
          `The organization has no \`${provider}\` git connection, so the repositories of ${appCount} app(s) will not be linked. Connect the git provider at ${DEFAULT_CONSOLE_BASE_URL}/organizations/${organizationId}/git before running the import to link them automatically, or link the repositories manually in the Capawesome Cloud Console afterwards.`,
        );
      }
      const outcomes: AppImportOutcome[] = [];
      for (const app of resolvedApps) {
        const outcome: AppImportOutcome = {
          app,
          errors: [],
          created: {
            automations: 0,
            certificates: 0,
            channels: 0,
            configurations: 0,
            destinations: 0,
            environments: 0,
          },
        };
        outcomes.push(outcome);
        if (dryRun) {
          continue;
        }
        await importApp(organizationId, outcome, unconnectedGitProviders);
      }

      const errorCount = outcomes.reduce((count, outcome) => count + outcome.errors.length, 0);
      if (json) {
        printJsonSummary(outcomes, selectedSkippedApps, warnings, dryRun === true);
      } else {
        printSummary(outcomes, selectedSkippedApps, dryRun === true, file);
      }
      if (errorCount > 0) {
        process.exitCode = 1;
      }
    } finally {
      removeTempDirectory();
      process.off('exit', removeTempDirectory);
      for (const signal of SIGNALS) {
        process.off(signal, handleSignal);
      }
    }
  }),
});

const selectApps = async (
  apps: AppImport[],
  skippedApps: SkippedAppImport[],
  include: string[] | undefined,
): Promise<{ selectedApps: AppImport[]; selectedSkippedApps: SkippedAppImport[] }> => {
  const filters = include
    ?.flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  if (filters && filters.length > 0) {
    const matchesFilter = (sourceId: string, sourceName: string): boolean =>
      filters.some((filter) => filter === sourceId || filter === sourceName);
    for (const filter of filters) {
      const matched =
        apps.some((app) => app.sourceId === filter || app.sourceName === filter) ||
        skippedApps.some((app) => app.sourceId === filter || app.sourceName === filter);
      if (!matched) {
        consola.warn(`No app in the export matches the filter \`${filter}\`.`);
      }
    }
    return {
      selectedApps: apps.filter((app) => matchesFilter(app.sourceId, app.sourceName)),
      selectedSkippedApps: skippedApps.filter((app) => matchesFilter(app.sourceId, app.sourceName)),
    };
  }
  if (isInteractive() && apps.length > 1) {
    // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
    const selectedIds: string[] = await prompt('Which apps do you want to import?', {
      type: 'multiselect',
      options: apps.map((app) => ({ label: `${app.sourceName} (${app.sourceId})`, value: app.sourceId })),
      initial: apps.map((app) => app.sourceId),
    });
    return {
      selectedApps: apps.filter((app) => selectedIds.includes(app.sourceId)),
      selectedSkippedApps: skippedApps,
    };
  }
  return { selectedApps: apps, selectedSkippedApps: skippedApps };
};

const resolveIonicAppTypes = async (
  apps: AppImport[],
  ionicAppType: 'capacitor' | 'cordova' | undefined,
): Promise<{ resolvedApps: AppImport[]; skippedApps: SkippedAppImport[] }> => {
  const resolvedApps: AppImport[] = [];
  const skippedApps: SkippedAppImport[] = [];
  for (const app of apps) {
    if (app.sourceAppType !== 'ionic') {
      resolvedApps.push(app);
      continue;
    }
    let type = ionicAppType;
    if (!type && isInteractive()) {
      // @ts-ignore wait till https://github.com/unjs/consola/pull/280 is merged
      type = await prompt(
        `The app \`${app.sourceName}\` was exported with the app type \`ionic\` which can mean Capacitor or Cordova. Which framework does the app use?`,
        {
          type: 'select',
          options: [
            { label: 'Capacitor', value: 'capacitor' },
            { label: 'Cordova', value: 'cordova' },
          ],
        },
      );
    }
    if (!type) {
      skippedApps.push({
        sourceId: app.sourceId,
        sourceName: app.sourceName,
        reason:
          'The app was exported with the ambiguous app type `ionic` which can mean Capacitor or Cordova. Provide the `--ionic-app-type` option or run the import interactively.',
        retryLater: false,
      });
      continue;
    }
    app.type = type;
    app.notes.push(`The app type \`ionic\` was resolved to \`${type}\`.`);
    resolvedApps.push(app);
  }
  return { resolvedApps, skippedApps };
};

const assignUniqueAppNames = async (apps: AppImport[], organizationId: string): Promise<void> => {
  const takenNames: string[] = [];
  const limit = 50;
  let offset = 0;
  while (true) {
    const page = await appsService.findAll({ organizationId, limit, offset });
    takenNames.push(...page.map((app) => app.name));
    if (page.length < limit) {
      break;
    }
    offset += limit;
  }
  for (const app of apps) {
    app.name = generateUniqueName(app.sourceName, takenNames);
    takenNames.push(app.name);
    if (app.name !== app.sourceName) {
      app.renames.push(
        `The app \`${app.sourceName}\` was renamed to \`${app.name}\` because its name is already taken in the organization.`,
      );
    }
  }
};

const findUnconnectedGitProviders = async (apps: AppImport[], organizationId: string): Promise<Set<string>> => {
  const providers = new Set(apps.flatMap((app) => (app.repository ? [app.repository.provider] : [])));
  const unconnectedProviders = new Set<string>();
  for (const provider of providers) {
    const gitConnections = await gitConnectionsService.findAll({
      organizationId,
      provider: GIT_CONNECTION_PROVIDERS[provider] ?? provider,
      limit: 1,
    });
    if (gitConnections.length === 0) {
      unconnectedProviders.add(provider);
    }
  }
  return unconnectedProviders;
};

const importApp = async (
  organizationId: string,
  outcome: AppImportOutcome,
  unconnectedGitProviders: Set<string>,
): Promise<void> => {
  const { app } = outcome;
  consola.start(`Importing app \`${app.sourceName}\`...`);
  let appId: string;
  try {
    const createdApp = await appsService.create({ name: app.name, organizationId, type: app.type });
    appId = createdApp.id;
    outcome.id = appId;
    consola.success(`Created app \`${app.name}\`.`);
  } catch (error) {
    outcome.errors.push(`Failed to create app: ${getMessageFromUnknownError(error)}`);
    consola.error(`Failed to create app \`${app.name}\`.`);
    return;
  }
  if (app.latestBuildNumber && app.latestBuildNumber > 0) {
    const nextAppBuildNumber = app.latestBuildNumber + 1;
    try {
      await appsService.update({ appId, nextAppBuildNumber });
      app.notes.push(
        `The next build number was set to \`${nextAppBuildNumber}\` to continue after the latest build number \`${app.latestBuildNumber}\`.`,
      );
      consola.success(`Set the next build number to ${nextAppBuildNumber}.`);
    } catch (error) {
      outcome.errors.push(`Failed to set the next build number: ${getMessageFromUnknownError(error)}`);
    }
  }
  for (const certificate of app.certificates) {
    try {
      const provisioningProfileIds: string[] = [];
      for (const profilePath of certificate.provisioningProfilePaths) {
        const profile = await appProvisioningProfilesService.create({
          appId,
          buffer: fs.readFileSync(profilePath),
          fileName: path.basename(profilePath),
        });
        provisioningProfileIds.push(profile.id);
      }
      const createdCertificate = await appCertificatesService.create({
        appId,
        buffer: fs.readFileSync(certificate.filePath),
        fileName: path.basename(certificate.filePath),
        name: certificate.name,
        platform: certificate.platform,
        password: certificate.password,
        keyAlias: certificate.keyAlias,
        keyPassword: certificate.keyPassword,
      });
      if (provisioningProfileIds.length > 0) {
        await appProvisioningProfilesService.updateMany({
          appId,
          ids: provisioningProfileIds,
          appCertificateId: createdCertificate.id,
        });
      }
      outcome.created.certificates++;
      consola.success(`Created certificate \`${certificate.name}\`.`);
    } catch (error) {
      outcome.errors.push(`Failed to create certificate \`${certificate.name}\`: ${getMessageFromUnknownError(error)}`);
    }
  }
  for (const environment of app.environments) {
    try {
      const createdEnvironment = await appEnvironmentsService.create({ appId, name: environment.name });
      if (environment.variables.length > 0) {
        await appEnvironmentsService.setVariables({
          appId,
          environmentId: createdEnvironment.id,
          variables: environment.variables,
        });
      }
      if (environment.secrets.length > 0) {
        await appEnvironmentsService.setSecrets({
          appId,
          environmentId: createdEnvironment.id,
          secrets: environment.secrets,
        });
      }
      outcome.created.environments++;
      consola.success(`Created environment \`${environment.name}\`.`);
    } catch (error) {
      outcome.errors.push(`Failed to create environment \`${environment.name}\`: ${getMessageFromUnknownError(error)}`);
    }
  }
  let existingChannelNames: string[] = [];
  try {
    const existingChannels = await appChannelsService.findAll({ appId });
    existingChannelNames = existingChannels.map((channel) => channel.name);
  } catch {
    // If the lookup fails, channel creation errors are reported individually below.
  }
  for (const channel of app.channels) {
    if (isNameTaken(channel, existingChannelNames)) {
      outcome.created.channels++;
      continue;
    }
    try {
      await appChannelsService.create({ appId, name: channel });
      outcome.created.channels++;
      consola.success(`Created channel \`${channel}\`.`);
    } catch (error) {
      outcome.errors.push(`Failed to create channel \`${channel}\`: ${getMessageFromUnknownError(error)}`);
    }
  }
  for (const configuration of app.configurations) {
    try {
      await appConfigurationsService.create({
        appId,
        name: configuration.name,
        displayName: configuration.displayName,
        packageName: configuration.packageName,
      });
      outcome.created.configurations++;
      consola.success(`Created configuration \`${configuration.name}\`.`);
    } catch (error) {
      outcome.errors.push(
        `Failed to create configuration \`${configuration.name}\`: ${getMessageFromUnknownError(error)}`,
      );
    }
  }
  for (const destination of app.destinations) {
    try {
      let appGoogleServiceAccountKeyId: string | undefined;
      if (destination.googleServiceAccountKeyPath) {
        const key = await appGoogleServiceAccountKeysService.create({
          appId,
          buffer: fs.readFileSync(destination.googleServiceAccountKeyPath),
          fileName: path.basename(destination.googleServiceAccountKeyPath),
        });
        appGoogleServiceAccountKeyId = key.id;
      }
      await appDestinationsService.create({
        appId,
        name: destination.name,
        platform: destination.platform,
        androidPackageName: destination.androidPackageName,
        androidBuildArtifactType: destination.androidBuildArtifactType,
        androidReleaseStatus: destination.androidReleaseStatus,
        googlePlayTrack: destination.googlePlayTrack,
        appGoogleServiceAccountKeyId,
        appleId: destination.appleId,
        appleAppId: destination.appleAppId,
        appleTeamId: destination.appleTeamId,
        appleAppPassword: destination.appleAppPassword,
      });
      outcome.created.destinations++;
      consola.success(`Created destination \`${destination.name}\`.`);
    } catch (error) {
      outcome.errors.push(`Failed to create destination \`${destination.name}\`: ${getMessageFromUnknownError(error)}`);
    }
  }
  for (const automation of app.automations) {
    try {
      await appAutomationsService.create({
        appId,
        name: automation.name,
        platform: automation.platform,
        triggerType: 'branch',
        triggerPatterns: [automation.triggerPattern],
        buildType: automation.buildType,
        enabled: automation.enabled,
        appCertificateName: automation.appCertificateName,
        appChannelName: automation.appChannelName,
        appConfigurationName: automation.appConfigurationName,
        appDestinationName: automation.appDestinationName,
        appEnvironmentName: automation.appEnvironmentName,
      });
      outcome.created.automations++;
      consola.success(`Created automation \`${automation.name}\`.`);
    } catch (error) {
      outcome.errors.push(`Failed to create automation \`${automation.name}\`: ${getMessageFromUnknownError(error)}`);
    }
  }
  if (app.repository && unconnectedGitProviders.has(app.repository.provider)) {
    app.notes.push(
      `The repository \`${app.repository.ownerSlug}/${app.repository.repositorySlug}\` was not linked because the organization has no \`${app.repository.provider}\` git connection.`,
    );
  } else if (app.repository) {
    try {
      await appsService.linkRepository({
        appId,
        ownerSlug: app.repository.ownerSlug,
        provider: app.repository.provider,
        repositorySlug: app.repository.repositorySlug,
        projectSlug: app.repository.projectSlug,
      });
      consola.success(`Linked repository \`${app.repository.ownerSlug}/${app.repository.repositorySlug}\`.`);
    } catch (error) {
      app.notes.push(
        `The repository \`${app.repository.ownerSlug}/${app.repository.repositorySlug}\` could not be linked: ${getMessageFromUnknownError(error)} Make sure the git provider is connected in the Capawesome Cloud Console and link the repository manually.`,
      );
    }
  }
};

const printSummary = (
  outcomes: AppImportOutcome[],
  skippedApps: SkippedAppImport[],
  dryRun: boolean,
  file: string,
): void => {
  consola.log('');
  if (dryRun) {
    consola.info('Dry run. No resources were created.');
  }
  console.table(
    outcomes.map((outcome) => ({
      App: outcome.app.sourceName,
      'Imported as': dryRun || outcome.id ? outcome.app.name : '—',
      Certificates: formatCount(outcome.created.certificates, outcome.app.certificates.length, dryRun),
      Environments: formatCount(outcome.created.environments, outcome.app.environments.length, dryRun),
      Channels: formatCount(outcome.created.channels, outcome.app.channels.length, dryRun),
      Configurations: formatCount(outcome.created.configurations, outcome.app.configurations.length, dryRun),
      Destinations: formatCount(outcome.created.destinations, outcome.app.destinations.length, dryRun),
      Automations: formatCount(outcome.created.automations, outcome.app.automations.length, dryRun),
      Errors: outcome.errors.length,
    })),
  );
  for (const outcome of outcomes) {
    if (outcome.app.notes.length === 0 && outcome.app.renames.length === 0 && outcome.errors.length === 0) {
      continue;
    }
    consola.log(`\n${outcome.app.sourceName}:`);
    for (const note of [...outcome.app.notes, ...outcome.app.renames]) {
      consola.warn(note);
    }
    for (const error of outcome.errors) {
      consola.error(error);
    }
  }
  if (outcomes.some((outcome) => outcome.app.renames.length > 0)) {
    consola.info(
      'Some resources were renamed because their names were already taken. Make sure to update any CI/CD workflows or scripts that reference the old names.',
    );
  }
  for (const outcome of outcomes) {
    if (outcome.id) {
      consola.info(`App URL: ${DEFAULT_CONSOLE_BASE_URL}/apps/${outcome.id}`);
    }
  }
  const retryLaterApps = skippedApps.filter((app) => app.retryLater);
  const otherSkippedApps = skippedApps.filter((app) => !app.retryLater);
  for (const app of otherSkippedApps) {
    consola.warn(`The app \`${app.sourceName}\` was skipped: ${app.reason}`);
  }
  if (retryLaterApps.length > 0) {
    const includeValues = retryLaterApps
      .map((app) => (app.sourceName.includes(',') ? app.sourceId : app.sourceName))
      .join(',');
    consola.info(
      `The apps ${retryLaterApps.map((app) => `\`${app.sourceName}\``).join(', ')} were skipped because their app type is not yet supported. Support is coming soon. You can import the remaining apps later by running:\n\nnpx @capawesome/cli apps:import --file "${file}" --include "${includeValues}"`,
    );
  }
  if (!dryRun) {
    consola.success('Import completed.');
  }
};

const formatCount = (created: number, total: number, dryRun: boolean): string => {
  return dryRun ? `${total}` : `${created}/${total}`;
};

const printJsonSummary = (
  outcomes: AppImportOutcome[],
  skippedApps: SkippedAppImport[],
  warnings: string[],
  dryRun: boolean,
): void => {
  console.log(
    JSON.stringify(
      {
        dryRun,
        warnings,
        apps: outcomes.map((outcome) => ({
          id: outcome.id ?? null,
          name: outcome.app.name,
          sourceId: outcome.app.sourceId,
          sourceName: outcome.app.sourceName,
          webUrl: outcome.id ? `${DEFAULT_CONSOLE_BASE_URL}/apps/${outcome.id}` : null,
          created: outcome.created,
          notes: outcome.app.notes,
          renames: outcome.app.renames,
          errors: outcome.errors,
        })),
        skippedApps: skippedApps.map((app) => ({
          sourceId: app.sourceId,
          sourceName: app.sourceName,
          reason: app.reason,
        })),
      },
      null,
      2,
    ),
  );
};
