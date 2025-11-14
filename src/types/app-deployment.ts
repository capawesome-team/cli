export interface AppDeploymentDto {
  id: string;
  appId: string;
  appBuildId: string;
  appDestinationId?: string;
  appDestinationName?: string;
  createdAt?: number;
  createdBy?: string;
}

export interface CreateAppDeploymentDto {
  appId: string;
  appBuildId: string;
  appDestinationName?: string;
}
