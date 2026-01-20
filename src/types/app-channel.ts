import { AppDeploymentDto } from './app-deployment.js';

export interface AppChannelDto {
  id: string;
  appDeployment?: AppDeploymentDto | null;
  appDeploymentId: string | null;
  appId: string;
  forceAppBuildArtifactSignature: boolean;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface CreateAppChannelDto {
  appId: string;
  forceAppBuildArtifactSignature?: boolean;
  name: string;
  expiresAt?: string;
}

export interface DeleteAppChannelDto {
  appId: string;
  id?: string;
  name?: string;
}

export interface FindOneAppChannelByIdDto {
  appId: string;
  id: string;
  relations?: string;
}

export interface FindAllAppChannelsDto {
  appId: string;
  name?: string;
  limit?: number;
  offset?: number;
}

export interface UpdateAppChannelDto {
  appId: string;
  appChannelId: string;
  name?: string;
}

export interface PauseAppChannelDto {
  appId: string;
  channelId: string;
}

export interface ResumeAppChannelDto {
  appId: string;
  channelId: string;
}
