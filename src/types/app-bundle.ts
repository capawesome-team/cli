export interface AppBundleDto {
  id: string;
}

export interface CreateAppBundleDto {
  appId: string;
  artifactType: 'manifest' | 'zip';
  channelName?: string;
  url?: string;
  maxAndroidAppVersionCode?: string;
  maxIosAppVersionCode?: string;
  minAndroidAppVersionCode?: string;
  minIosAppVersionCode?: string;
  rolloutPercentage?: number;
}

export interface DeleteAppBundleDto {
  appBundleId: string;
  appId: string;
}

export interface MultipartUploadDto {
  key: string;
  uploadId: string;
}

export interface UpdateAppBundleDto {
  appBundleId: string;
  appId: string;
  artifactStatus?: 'pending' | 'ready';
  maxAndroidAppVersionCode?: string;
  maxIosAppVersionCode?: string;
  minAndroidAppVersionCode?: string;
  minIosAppVersionCode?: string;
  rolloutPercentage?: number;
}
