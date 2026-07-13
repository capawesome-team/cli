export interface AppBundleDto {
  id: string;
  appBuildId?: string;
  appDeploymentId?: string | null;
}

export interface CreateAppBundleDto {
  appId: string;
  artifactType: 'manifest' | 'zip';
  channelName?: string;
  checksum?: string;
  eqAndroidAppVersionCode?: string;
  eqElectronAppVersionCode?: string;
  eqIosAppVersionCode?: string;
  gitCommitMessage?: string;
  gitCommitRef?: string;
  gitCommitSha?: string;
  gitRef?: string;
  customProperties?: Record<string, string>;
  expiresAt?: string;
  url?: string;
  maxAndroidAppVersionCode?: string;
  maxElectronAppVersionCode?: string;
  maxIosAppVersionCode?: string;
  minAndroidAppVersionCode?: string;
  minElectronAppVersionCode?: string;
  minIosAppVersionCode?: string;
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
  maxElectronAppVersionCode?: string;
  maxIosAppVersionCode?: string;
  minAndroidAppVersionCode?: string;
  minElectronAppVersionCode?: string;
  minIosAppVersionCode?: string;
  eqAndroidAppVersionCode?: string;
  eqElectronAppVersionCode?: string;
  eqIosAppVersionCode?: string;
  rolloutPercentage?: number;
}
