export interface AppBundleDto {
  id: string;
}

export interface CreateAppBundleDto {
  appId: string;
  artifactType: 'manifest' | 'zip';
  channelName?: string;
  checksum?: string;
  gitCommitMessage?: string;
  gitCommitRef?: string;
  gitCommitSha?: string;
  customProperties?: Record<string, string>;
  expiresAt?: string;
  url?: string;
  maxAndroidAppVersionCode?: string;
  maxIosAppVersionCode?: string;
  minAndroidAppVersionCode?: string;
  minIosAppVersionCode?: string;
  eqAndroidAppVersionCode?: string;
  eqIosAppVersionCode?: string;
  rolloutPercentage?: number;
  signature?: string;
}

export interface DeleteAppBundleDto {
  appBundleId: string;
  appId: string;
}

export interface UpdateAppBundleDto {
  appBundleFileId?: string;
  appBundleId: string;
  appId: string;
  artifactStatus?: 'pending' | 'ready';
  maxAndroidAppVersionCode?: string;
  maxIosAppVersionCode?: string;
  minAndroidAppVersionCode?: string;
  minIosAppVersionCode?: string;
  rolloutPercentage?: number;
}
