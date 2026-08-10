import { AppAutomationPlatform } from '@/types/app-automation.js';
import { EnvironmentVariable } from '@/types/app-environment.js';
import { AppType } from '@/types/app.js';
import { GitRemoteInfo } from '@/utils/git.js';

export interface AppImport {
  sourceId: string;
  sourceName: string;
  sourceAppType: string;
  name: string;
  type: AppType;
  notes: string[];
  automations: AppImportAutomation[];
  certificates: AppImportCertificate[];
  channels: string[];
  configurations: AppImportConfiguration[];
  destinations: AppImportDestination[];
  environments: AppImportEnvironment[];
  repository: GitRemoteInfo | null;
}

export interface AppImportAutomation {
  name: string;
  platform: AppAutomationPlatform;
  triggerPattern: string;
  buildType?: string;
  enabled: boolean;
  appCertificateName?: string;
  appChannelName?: string;
  appConfigurationName?: string;
  appDestinationName?: string;
  appEnvironmentName?: string;
}

export interface AppImportCertificate {
  name: string;
  platform: 'android' | 'ios';
  filePath: string;
  password: string;
  keyAlias?: string;
  keyPassword?: string;
  provisioningProfilePaths: string[];
}

export interface AppImportConfiguration {
  name: string;
  displayName?: string;
  packageName?: string;
}

export interface AppImportDestination {
  name: string;
  platform: 'android' | 'ios';
  androidPackageName?: string;
  androidBuildArtifactType?: 'aab' | 'apk';
  googlePlayTrack?: string;
  googleServiceAccountKeyPath?: string;
  appleId?: string;
  appleAppId?: string;
  appleTeamId?: string;
  appleAppPassword?: string;
}

export interface AppImportEnvironment {
  name: string;
  variables: EnvironmentVariable[];
  secrets: EnvironmentVariable[];
}

export interface SkippedAppImport {
  sourceId: string;
  sourceName: string;
  reason: string;
  retryLater: boolean;
}

export const generateUniqueAppName = (name: string, takenNames: Set<string>): string => {
  if (!takenNames.has(name)) {
    return name;
  }
  let counter = 2;
  while (takenNames.has(`${name} (${counter})`)) {
    counter++;
  }
  return `${name} (${counter})`;
};
