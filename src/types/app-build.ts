import { JobDto } from './job.js';

export interface AppBuildArtifactDto {
  id: string;
  fileMimeType: string;
  fileName: string;
  fileSizeInBytes: number;
  status: 'pending' | 'ready';
  type: 'apk' | 'aab' | 'ipa' | 'zip';
}

export interface AppBuildDto {
  id: string;
  appBuildArtifactId: string | null;
  appBuildArtifacts?: AppBuildArtifactDto[];
  appCertificateId?: string;
  appEnvironmentId?: string;
  appBuildSourceId?: string;
  appId: string;
  gitRef?: string;
  job?: JobDto;
  jobId: string;
  numberAsString: string;
  platform: 'ios' | 'android' | 'web';
  type: string;
}

export interface CreateAppBuildDto {
  adHocEnvironmentVariables?: Record<string, string>;
  appBuildSourceId?: string;
  appCertificateName?: string;
  appEnvironmentName?: string;
  appId: string;
  stack?: 'macos-sequoia' | 'macos-tahoe';
  gitRef?: string;
  platform: 'ios' | 'android' | 'web';
  type?: string;
}

export interface AppBuildShareDto {
  id: string;
  appBuildId: string;
  description: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppBuildShareDto {
  appId: string;
  appBuildId: string;
  description?: string;
  expiresAt?: string;
}

export interface DeleteAppBuildShareDto {
  appId: string;
  appBuildId: string;
  id: string;
}

export interface FindAllAppBuildSharesDto {
  appId: string;
  appBuildId: string;
}

export interface FindOneAppBuildDto {
  appId: string;
  appBuildId: string;
  relations?: string;
}

export interface UpdateAppBuildDto {
  appId: string;
  appBuildId: string;
  customProperties?: Record<string, string>;
  eqAndroidAppVersionCode?: string;
  maxAndroidAppVersionCode?: string;
  minAndroidAppVersionCode?: string;
  eqIosAppVersionCode?: string;
  maxIosAppVersionCode?: string;
  minIosAppVersionCode?: string;
}

export interface FindAllAppBuildsDto {
  appId: string;
  limit?: number;
  numberAsString?: string;
  offset?: number;
  platform?: 'android' | 'ios' | 'web';
  relations?: string;
}
