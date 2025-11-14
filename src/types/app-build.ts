import { JobDto } from './job.js';

export interface AppBuildDto {
  id: string;
  appId: string;
  platform: 'ios' | 'android';
  type: string;
  gitRef: string;
  appEnvironmentId?: string;
  appCertificateId?: string;
  jobId: string;
  number: string;
  createdAt?: number;
  createdBy?: string;
  job?: JobDto;
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
