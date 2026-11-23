export interface DeleteAppDeviceDto {
  appId: string;
  deviceId: string;
}

export interface ProbeAppDeviceDto {
  appId: string;
  deviceId: string;
}

export interface ProbeAppDeviceResponseDto {
  bundle: { id: string } | null;
  channelName: string | null;
  reason: string | null;
  result: 'available' | 'skipped' | 'up_to_date';
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
