export interface AppChannelDto {
  id: string;
  appId: string;
  name: string;
  totalAppBundleLimit: number;
}

export interface CreateAppChannelDto {
  appId: string;
  name: string;
  totalAppBundleLimit?: number;
}

export interface DeleteAppChannelDto {
  appId: string;
  id?: string;
  name?: string;
}

export interface FindOneAppChannelByIdDto {
  appId: string;
  id: string;
}

export interface FindAllAppChannelsDto {
  appId: string;
  name?: string;
}

export interface UpdateAppChannelDto {
  appId: string;
  appChannelId: string;
  name?: string;
  totalAppBundleLimit?: number;
}
