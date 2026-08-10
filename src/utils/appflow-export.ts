import {
  AppImport,
  AppImportAutomation,
  AppImportCertificate,
  AppImportConfiguration,
  AppImportDestination,
  AppImportEnvironment,
  SkippedAppImport,
} from '@/utils/app-import.js';
import { getMessageFromUnknownError, UserError } from '@/utils/error.js';
import { parseGitRemoteUrl } from '@/utils/git.js';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';

export interface ParsedAppflowExport {
  apps: AppImport[];
  skippedApps: SkippedAppImport[];
}

const WEBHOOKS_DOCS_URL = 'https://capawesome.io/docs/cloud/webhooks/';
const LIVE_UPDATES_DOCS_URL = 'https://capawesome.io/docs/cloud/live-updates/';
const SUPPORTED_BUILD_TYPES = ['ad-hoc', 'app-store', 'debug', 'development', 'enterprise', 'release', 'simulator'];

const appDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  appType: z.string(),
});

const repoAssociationSchema = z.union([
  z.object({
    gitProvider: z.string(),
    cloneUrl: z.string(),
  }),
  z.array(z.unknown()),
]);

const environmentsSchema = z.array(
  z.object({
    id: z.number(),
    name: z.string(),
    vars: z.record(z.string(), z.string()).nullish(),
    secrets: z.record(z.string(), z.string()).nullish(),
  }),
);

const liveUpdateChannelsSchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
  }),
);

const nativeConfigsSchema = z.array(
  z.object({
    id: z.number(),
    name: z.string(),
    configs: z
      .object({
        base: z
          .object({
            name: z.string().nullish(),
            bundle_id: z.string().nullish(),
          })
          .nullish(),
        ionic: z.record(z.string(), z.unknown()).nullish(),
      })
      .nullish(),
  }),
);

const nativeBuildAutomationsSchema = z.array(
  z.object({
    name: z.string(),
    gitBranch: z.string(),
    platform: z.enum(['android', 'ios']),
    buildType: z.string().nullish(),
    environmentId: z.number().nullish(),
    webhook: z.string().nullish(),
    automationEnabled: z.boolean(),
    nativeConfigId: z.number().nullish(),
    signingCertificateId: z.number().nullish(),
    destinationId: z.number().nullish(),
  }),
);

const webBuildAutomationsSchema = z.array(
  z.object({
    name: z.string(),
    gitBranch: z.string(),
    environmentId: z.number().nullish(),
    webhook: z.string().nullish(),
    automationEnabled: z.boolean(),
    channelIds: z.array(z.string()).nullish(),
    webPreviewEnabled: z.boolean().nullish(),
  }),
);

const androidSigningCertificateSchema = z.object({
  id: z.number(),
  name: z.string(),
  keystoreFile: z.string(),
  keystorePassword: z.string(),
  keyAlias: z.string(),
  keyPassword: z.string(),
});

const iosSigningCertificateSchema = z.object({
  id: z.number(),
  name: z.string(),
  p12File: z.string(),
  p12Password: z.string(),
  provisioningProfiles: z.array(z.string()).nullish(),
});

const playStoreDestinationSchema = z.object({
  id: z.number(),
  name: z.string(),
  artifactType: z.string().nullish(),
  packageName: z.string().nullish(),
  track: z.string().nullish(),
});

const appStoreDestinationSchema = z.object({
  id: z.number(),
  name: z.string(),
  appleId: z.string().nullish(),
  appAppleId: z.string().nullish(),
  appPassword: z.string().nullish(),
  teamId: z.string().nullish(),
});

export const parseAppflowExport = async (directory: string): Promise<ParsedAppflowExport> => {
  const appsDirectory = path.join(directory, 'apps');
  if (!fs.existsSync(appsDirectory) || !fs.statSync(appsDirectory).isDirectory()) {
    throw new UserError(
      'The provided file does not look like an Ionic Appflow export. It must contain an `apps` directory.',
    );
  }
  const apps: AppImport[] = [];
  const skippedApps: SkippedAppImport[] = [];
  const appFolders = fs
    .readdirSync(appsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(appsDirectory, entry.name));
  for (const appFolder of appFolders) {
    try {
      const detail = parseJsonFile(path.join(appFolder, 'app-detail.json'), appDetailSchema);
      const type = mapAppType(detail.appType);
      if (!type) {
        skippedApps.push({
          sourceId: detail.id,
          sourceName: detail.name,
          reason: `App type \`${detail.appType}\` is not yet supported.`,
          retryLater: detail.appType === 'react_native' || detail.appType === 'flutter',
        });
        continue;
      }
      apps.push(parseApp(appFolder, detail, type));
    } catch (error) {
      skippedApps.push({
        sourceId: '',
        sourceName: path.basename(appFolder),
        reason: getMessageFromUnknownError(error),
        retryLater: false,
      });
    }
  }
  return { apps, skippedApps };
};

const mapAppType = (appType: string): AppImport['type'] | undefined => {
  switch (appType) {
    case 'android':
    case 'capacitor':
    case 'cordova':
    case 'ios':
      return appType;
    case 'ionic':
      // Placeholder only: `ionic` can mean Capacitor or Cordova. The import command
      // resolves the actual type based on the `sourceAppType` before importing.
      return 'capacitor';
    default:
      return undefined;
  }
};

const parseApp = (appFolder: string, detail: z.infer<typeof appDetailSchema>, type: AppImport['type']): AppImport => {
  const notes: string[] = [];
  const environments = parseJsonFileIfExists(path.join(appFolder, 'environments.json'), environmentsSchema) ?? [];
  const channels =
    parseJsonFileIfExists(path.join(appFolder, 'live-update-channels.json'), liveUpdateChannelsSchema) ?? [];
  const nativeConfigs = parseJsonFileIfExists(path.join(appFolder, 'native-configs.json'), nativeConfigsSchema) ?? [];
  const certificates = parseCertificates(appFolder, notes);
  const destinations = parseDestinations(appFolder);
  return {
    sourceId: detail.id,
    sourceName: detail.name,
    sourceAppType: detail.appType,
    name: detail.name,
    type,
    notes,
    automations: parseAutomations(
      appFolder,
      {
        certificateNamesById: toNameMap(
          certificates.map((certificate) => ({ id: certificate.id, name: certificate.certificate.name })),
        ),
        channelNamesById: new Map(channels.map((channel) => [channel.id, channel.name])),
        configurationNamesById: toNameMap(nativeConfigs),
        destinationNamesById: toNameMap(
          destinations.map((destination) => ({ id: destination.id, name: destination.destination.name })),
        ),
        environmentNamesById: toNameMap(environments),
      },
      notes,
    ),
    certificates: certificates.map((certificate) => certificate.certificate),
    channels: channels.map((channel) => channel.name),
    configurations: parseConfigurations(nativeConfigs, notes),
    destinations: destinations.map((destination) => destination.destination),
    environments: environments.map(
      (environment): AppImportEnvironment => ({
        name: environment.name,
        variables: Object.entries(environment.vars ?? {}).map(([key, value]) => ({ key, value })),
        secrets: Object.entries(environment.secrets ?? {}).map(([key, value]) => ({ key, value })),
      }),
    ),
    repository: parseRepository(appFolder, notes),
  };
};

const parseRepository = (appFolder: string, notes: string[]): AppImport['repository'] => {
  const repoAssociation = parseJsonFileIfExists(path.join(appFolder, 'repo-association.json'), repoAssociationSchema);
  if (!repoAssociation || Array.isArray(repoAssociation)) {
    return null;
  }
  try {
    return parseGitRemoteUrl(repoAssociation.cloneUrl);
  } catch {
    notes.push(
      `The git repository \`${repoAssociation.cloneUrl}\` (provider \`${repoAssociation.gitProvider}\`) is not supported and was not linked. You can link a repository manually in the Capawesome Cloud Console.`,
    );
    return null;
  }
};

const parseConfigurations = (
  nativeConfigs: z.infer<typeof nativeConfigsSchema>,
  notes: string[],
): AppImportConfiguration[] => {
  const configurationsWithLiveUpdateSettings = nativeConfigs.filter((config) => config.configs?.ionic);
  if (configurationsWithLiveUpdateSettings.length > 0) {
    notes.push(
      `The native configurations ${configurationsWithLiveUpdateSettings.map((config) => `\`${config.name}\``).join(', ')} contain Live Update plugin settings which are not part of configurations in Capawesome Cloud. Configure the Live Update plugin in your app instead (see ${LIVE_UPDATES_DOCS_URL}).`,
    );
  }
  return nativeConfigs.map((config) => ({
    name: config.name,
    displayName: config.configs?.base?.name ?? undefined,
    packageName: config.configs?.base?.bundle_id ?? undefined,
  }));
};

interface ParsedCertificate {
  id: number;
  certificate: AppImportCertificate;
}

const parseCertificates = (appFolder: string, notes: string[]): ParsedCertificate[] => {
  const certificates: ParsedCertificate[] = [];
  for (const folder of getSubfolders(path.join(appFolder, 'signing-certificates', 'android'))) {
    const metadata = parseJsonFile(
      path.join(folder, 'android-signing-certificate.json'),
      androidSigningCertificateSchema,
    );
    const filePath = path.join(folder, metadata.keystoreFile);
    if (!fs.existsSync(filePath)) {
      notes.push(
        `The signing certificate \`${metadata.name}\` was skipped because the file \`${metadata.keystoreFile}\` is missing in the export.`,
      );
      continue;
    }
    certificates.push({
      id: metadata.id,
      certificate: {
        name: metadata.name,
        platform: 'android',
        filePath,
        password: metadata.keystorePassword,
        keyAlias: metadata.keyAlias,
        keyPassword: metadata.keyPassword,
        provisioningProfilePaths: [],
      },
    });
  }
  for (const folder of getSubfolders(path.join(appFolder, 'signing-certificates', 'ios'))) {
    const metadata = parseJsonFile(path.join(folder, 'ios-signing-certificate.json'), iosSigningCertificateSchema);
    const filePath = path.join(folder, metadata.p12File);
    if (!fs.existsSync(filePath)) {
      notes.push(
        `The signing certificate \`${metadata.name}\` was skipped because the file \`${metadata.p12File}\` is missing in the export.`,
      );
      continue;
    }
    const provisioningProfilePaths: string[] = [];
    for (const profileFile of new Set(metadata.provisioningProfiles ?? [])) {
      const profilePath = path.join(folder, profileFile);
      if (!fs.existsSync(profilePath)) {
        notes.push(
          `The provisioning profile \`${profileFile}\` of the signing certificate \`${metadata.name}\` is missing in the export and was skipped.`,
        );
        continue;
      }
      provisioningProfilePaths.push(profilePath);
    }
    certificates.push({
      id: metadata.id,
      certificate: {
        name: metadata.name,
        platform: 'ios',
        filePath,
        password: metadata.p12Password,
        provisioningProfilePaths,
      },
    });
  }
  return certificates;
};

interface ParsedDestination {
  id: number;
  destination: AppImportDestination;
}

const parseDestinations = (appFolder: string): ParsedDestination[] => {
  const destinations: ParsedDestination[] = [];
  for (const folder of getSubfolders(path.join(appFolder, 'store-destinations', 'android'))) {
    const metadata = parseJsonFile(path.join(folder, 'play-store-destination.json'), playStoreDestinationSchema);
    const googleServiceAccountKeyPath = path.join(folder, 'json-key.json');
    destinations.push({
      id: metadata.id,
      destination: {
        name: metadata.name,
        platform: 'android',
        androidPackageName: metadata.packageName ?? undefined,
        androidBuildArtifactType:
          metadata.artifactType === 'aab' || metadata.artifactType === 'apk' ? metadata.artifactType : undefined,
        googlePlayTrack: metadata.track ?? undefined,
        googleServiceAccountKeyPath: fs.existsSync(googleServiceAccountKeyPath)
          ? googleServiceAccountKeyPath
          : undefined,
      },
    });
  }
  for (const folder of getSubfolders(path.join(appFolder, 'store-destinations', 'ios'))) {
    const metadata = parseJsonFile(path.join(folder, 'app-store-destination.json'), appStoreDestinationSchema);
    destinations.push({
      id: metadata.id,
      destination: {
        name: metadata.name,
        platform: 'ios',
        appleId: metadata.appleId ?? undefined,
        appleAppId: metadata.appAppleId ?? undefined,
        appleTeamId: metadata.teamId ?? undefined,
        appleAppPassword: metadata.appPassword ?? undefined,
      },
    });
  }
  return destinations;
};

interface AutomationReferences {
  certificateNamesById: Map<number, string>;
  channelNamesById: Map<string, string>;
  configurationNamesById: Map<number, string>;
  destinationNamesById: Map<number, string>;
  environmentNamesById: Map<number, string>;
}

const parseAutomations = (
  appFolder: string,
  references: AutomationReferences,
  notes: string[],
): AppImportAutomation[] => {
  const automations: AppImportAutomation[] = [];
  const nativeAutomations =
    parseJsonFileIfExists(path.join(appFolder, 'native-build-automations.json'), nativeBuildAutomationsSchema) ?? [];
  const webAutomations =
    parseJsonFileIfExists(path.join(appFolder, 'web-build-automations.json'), webBuildAutomationsSchema) ?? [];
  const automationsWithWebhook = [...nativeAutomations, ...webAutomations].filter((automation) => automation.webhook);
  if (automationsWithWebhook.length > 0) {
    notes.push(
      `The webhooks of the automations ${automationsWithWebhook.map((automation) => `\`${automation.name}\``).join(', ')} were not imported because Capawesome Cloud supports webhooks at the app level instead. Please add them manually (see ${WEBHOOKS_DOCS_URL}).`,
    );
  }
  for (const automation of nativeAutomations) {
    let buildType = automation.buildType ?? undefined;
    if (buildType && !SUPPORTED_BUILD_TYPES.includes(buildType)) {
      notes.push(
        `The automation \`${automation.name}\` has the unsupported build type \`${buildType}\` which was skipped.`,
      );
      buildType = undefined;
    }
    automations.push({
      name: automation.name,
      platform: automation.platform,
      triggerPattern: automation.gitBranch,
      buildType,
      enabled: automation.automationEnabled,
      appCertificateName: resolveName(
        references.certificateNamesById,
        automation.signingCertificateId,
        automation.name,
        'signing certificate',
        notes,
      ),
      appConfigurationName: resolveName(
        references.configurationNamesById,
        automation.nativeConfigId,
        automation.name,
        'native configuration',
        notes,
      ),
      appDestinationName: resolveName(
        references.destinationNamesById,
        automation.destinationId,
        automation.name,
        'destination',
        notes,
      ),
      appEnvironmentName: resolveName(
        references.environmentNamesById,
        automation.environmentId,
        automation.name,
        'environment',
        notes,
      ),
    });
  }
  for (const automation of webAutomations) {
    if (automation.webPreviewEnabled) {
      notes.push(
        `The automation \`${automation.name}\` has web previews enabled which are not supported by Capawesome Cloud.`,
      );
    }
    const channelNames = (automation.channelIds ?? [])
      .map((channelId) => resolveName(references.channelNamesById, channelId, automation.name, 'channel', notes))
      .filter((name): name is string => !!name);
    const appEnvironmentName = resolveName(
      references.environmentNamesById,
      automation.environmentId,
      automation.name,
      'environment',
      notes,
    );
    if (channelNames.length === 0) {
      automations.push({
        name: automation.name,
        platform: 'web',
        triggerPattern: automation.gitBranch,
        enabled: automation.automationEnabled,
        appEnvironmentName,
      });
      continue;
    }
    for (const channelName of channelNames) {
      automations.push({
        name: channelNames.length > 1 ? `${automation.name} (${channelName})` : automation.name,
        platform: 'web',
        triggerPattern: automation.gitBranch,
        enabled: automation.automationEnabled,
        appChannelName: channelName,
        appEnvironmentName,
      });
    }
  }
  return automations;
};

const resolveName = <TId>(
  namesById: Map<TId, string>,
  id: TId | null | undefined,
  automationName: string,
  label: string,
  notes: string[],
): string | undefined => {
  if (id === null || id === undefined) {
    return undefined;
  }
  const name = namesById.get(id);
  if (!name) {
    notes.push(`The automation \`${automationName}\` references an unknown ${label} which was skipped.`);
    return undefined;
  }
  return name;
};

const toNameMap = (entities: { id: number; name: string }[]): Map<number, string> => {
  return new Map(entities.map((entity) => [entity.id, entity.name]));
};

const getSubfolders = (directory: string): string[] => {
  if (!fs.existsSync(directory)) {
    return [];
  }
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(directory, entry.name));
};

const parseJsonFile = <TSchema extends z.ZodType>(filePath: string, schema: TSchema): z.infer<TSchema> => {
  let json: unknown;
  try {
    json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    throw new UserError(`The export file \`${path.basename(filePath)}\` is missing or contains invalid JSON.`);
  }
  const result = schema.safeParse(json);
  if (!result.success) {
    throw new UserError(`The export file \`${path.basename(filePath)}\` has an unexpected format.`);
  }
  return result.data;
};

const parseJsonFileIfExists = <TSchema extends z.ZodType>(
  filePath: string,
  schema: TSchema,
): z.infer<TSchema> | undefined => {
  if (!fs.existsSync(filePath)) {
    return undefined;
  }
  return parseJsonFile(filePath, schema);
};
