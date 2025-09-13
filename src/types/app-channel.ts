export interface AppChannelDto {
  id: string;
  appId: string;
  name: string;
  totalAppBundleLimit: number;
  createdAt: number;
  updatedAt: number;
}

export interface CreateAppChannelDto {
  appId: string;
  name: string;
  totalAppBundleLimit?: number;
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
  totalAppBundleLimit?: number;
}
