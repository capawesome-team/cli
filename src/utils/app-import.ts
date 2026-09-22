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
  latestBuildNumber?: number;
  notes: string[];
  renames: string[];
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
  androidReleaseStatus?: 'completed' | 'draft';
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

// Capawesome Cloud enforces name uniqueness on the lowercased name.
export const isNameTaken = (name: string, takenNames: string[]): boolean =>
  takenNames.some((takenName) => takenName.toLowerCase() === name.toLowerCase());

export const generateUniqueName = (name: string, takenNames: string[]): string => {
  let uniqueName = name;
  let counter = 2;
  while (isNameTaken(uniqueName, takenNames)) {
    uniqueName = `${name} (${counter})`;
    counter++;
  }
  return uniqueName;
};
