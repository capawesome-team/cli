export interface AppChannelDto {
  id: string;
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
