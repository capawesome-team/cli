export interface AppChannelDto {
  id: string;
}

export interface CreateAppChannelDto {
  appId: string;
  name: string;
}

export interface DeleteAppChannelDto {
  appId: string;
  name: string;
}
