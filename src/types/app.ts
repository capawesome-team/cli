import { AppBuildStack } from './app-build.js';

export interface AppDto {
  id: string;
  name: string;
  organizationId: string;
  type: AppType;
}

export type AppType = 'android' | 'capacitor' | 'cordova' | 'ios';

export interface CreateAppDto {
  name: string;
  organizationId: string;
  type: AppType;
}

export interface DeleteAppDto {
  id: string;
}

export interface FindAllAppsDto {
  organizationId: string;
  limit?: number;
  offset?: number;
}

export interface FindOneAppDto {
  appId: string;
}

export interface LinkAppRepositoryDto {
  appId: string;
  gitConnectionId: string;
  path: string;
}

export interface TransferAppDto {
  appId: string;
  organizationId: string;
}

export interface UpdateAppDto {
  appChannelDiscoveryEnabled?: boolean;
  appChannelName?: string | null;
  appConfigurationName?: string | null;
  appEnvironmentName?: string | null;
  appId: string;
  buildStack?: AppBuildStack | null;
  name?: string;
  nextAppBuildNumber?: number;
  type?: AppType;
}

export interface UnlinkAppRepositoryDto {
  appId: string;
}
