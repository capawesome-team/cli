export interface AppBuildSourceDto {
  id: string;
  status: string;
}

export interface CreateAppBuildSourceDto {
  appId: string;
  fileSizeInBytes?: number;
  fileUrl?: string;
}
