export interface DeleteAppDeviceDto {
  appId: string;
  deviceId: string;
}

export interface UpdateAppDeviceDto {
  appId: string;
  deviceId: string;
  forcedAppChannelId?: string | null;
}
