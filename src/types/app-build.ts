import { JobDto } from './job.js';

export interface AppBuildArtifactDto {
  id: string;
  fileMimeType: string;
  fileName: string;
  fileSizeInBytes: number;
  status: 'pending' | 'ready';
  type: 'apk' | 'aab' | 'ipa' | 'zip';
  createdAt: number;
}

export interface AppBuildDto {
  id: string;
  appBuildArtifacts?: AppBuildArtifactDto[];
  appCertificateId?: string;
  appEnvironmentId?: string;
  appId: string;
  gitRef?: string;
  job?: JobDto;
  jobId: string;
  numberAsString: string;
  platform: 'ios' | 'android' | 'web';
  sourceUrl?: string;
  type: string;
  createdAt?: number;
  createdBy?: string;
}

export interface CreateAppBuildDto {
  appCertificateName?: string;
  appEnvironmentName?: string;
  appId: string;
  stack?: 'macos-sequoia' | 'macos-tahoe';
  gitRef?: string;
  platform: 'ios' | 'android' | 'web';
  sourceUrl?: string;
  type?: string;
}

export interface FindOneAppBuildDto {
  appId: string;
  appBuildId: string;
  relations?: string;
}

export interface UpdateAppBuildDto {
  appId: string;
  appBuildId: string;
  eqAndroidAppVersionCode?: string;
  maxAndroidAppVersionCode?: string;
  minAndroidAppVersionCode?: string;
  eqIosAppVersionCode?: string;
  maxIosAppVersionCode?: string;
  minIosAppVersionCode?: string;
}

export interface FindAllAppBuildsDto {
  appId: string;
  numberAsString?: string;
  platform?: 'android' | 'ios' | 'web';
}
