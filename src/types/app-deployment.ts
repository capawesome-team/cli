import { JobDto } from './job.js';

export interface AppDeploymentDto {
  id: string;
  appId: string;
  appBuildId: string;
  appDestinationId?: string;
  appDestinationName?: string;
  jobId: string;
  job?: JobDto;
}

export interface CreateAppDeploymentDto {
  appId: string;
  appBuildId: string;
  appDestinationName?: string;
}

export interface FindOneAppDeploymentDto {
  appId: string;
  appDeploymentId: string;
  relations?: string;
}

export interface FindAllAppDeploymentsDto {
  appId: string;
}
