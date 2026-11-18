import { AppType } from './app.js';
import { AppChannelDto } from './app-channel.js';

export interface AppDeviceDto {
  id: string;
  appBuildArtifactId: string | null;
  appChannel?: AppChannelDto | null;
  appChannelId: string | null;
  appDeploymentId: string | null;
  appId: string;
  appVersionCode: string;
  appVersionName: string;
  country: string | null;
  customId: string | null;
  forcedAppChannelId: string | null;
  lastSeenAt: string;
  osVersion: string;
  platform: number;
  pluginVersion: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeleteAppDeviceDto {
  appId: string;
  deviceId: string;
}

export interface FindOneAppDeviceDto {
  appId: string;
  deviceId: string;
}

export interface ProbeAppDeviceDto {
  appId: string;
  appVersionCode: string;
  appVersionName: string;
  bundleId?: string;
  channelName?: string;
  customId?: string;
  deviceId?: string;
  osVersion: string;
  platform: number;
  pluginVersion: string;
  runtime: AppType;
}

export interface ProbeAppDeviceResponseDto {
  artifactType: 'manifest' | 'zip';
  bundleId: string;
  channelName: string;
  checksum: string | null;
  customProperties: Record<string, string> | null;
  signature: string | null;
  url: string;
}

export interface UpdateAppDeviceDto {
  appId: string;
  deviceId: string;
  forcedAppChannelId?: string | null;
}

export interface UpdateAppDevicesDto {
  appId: string;
  deviceIds: string[];
  forcedAppChannelId?: string | null;
}
