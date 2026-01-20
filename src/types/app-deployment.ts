import { AppBuildDto } from './app-build.js';
import { JobDto } from './job.js';

export interface AppDeploymentDto {
  id: string;
  appId: string;
  appBuild?: AppBuildDto;
  appBuildId: string;
  appDestinationId?: string;
  appDestinationName?: string;
  appChannelName?: string;
  jobId: string;
  job?: JobDto;
}

export interface CreateAppDeploymentDto {
  appId: string;
  appBuildId: string;
  appDestinationName?: string;
  appChannelName?: string;
}

export interface FindOneAppDeploymentDto {
  appId: string;
  appDeploymentId: string;
  relations?: string;
}

export interface FindAllAppDeploymentsDto {
  appId: string;
  appChannelId?: string;
  limit?: number;
  relations?: string;
}
