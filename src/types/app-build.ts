import { JobDto } from './job.js';

export interface AppBuildArtifactDto {
  id: string;
  fileMimeType: string;
  fileName: string;
  fileSizeInBytes: number;
  status: 'expired' | 'pending' | 'ready';
  type: 'apk' | 'aab' | 'ipa';
  createdAt: number;
}

export interface AppBuildDto {
  id: string;
  appBuildArtifacts?: AppBuildArtifactDto[];
  appCertificateId?: string;
  appEnvironmentId?: string;
  appId: string;
  gitRef: string;
  job?: JobDto;
  jobId: string;
  numberAsString: string;
  platform: 'ios' | 'android';
  type: string;
  createdAt?: number;
  createdBy?: string;
}

export interface CreateAppBuildDto {
  appCertificateName?: string;
  appEnvironmentName?: string;
  appId: string;
  gitRef: string;
  platform: 'ios' | 'android';
  type: string;
}

export interface FindOneAppBuildDto {
  appId: string;
  appBuildId: string;
  relations?: string;
}

export interface FindAllAppBuildsDto {
  appId: string;
}
