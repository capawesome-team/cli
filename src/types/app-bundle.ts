import FormData from 'form-data';

export interface AppBundleDto {
  id: string;
}

export interface CreateAppBundleDto {
  appId: string;
  formData: FormData;
}

export interface DeleteAppBundleDto {
  appId: string;
  bundleId: string;
}

export interface UpadteAppBundleDto {
  appId: string;
  bundleId: string;
  maxAndroidAppVersionCode?: string;
  maxIosAppVersionCode?: string;
  minAndroidAppVersionCode?: string;
  minIosAppVersionCode?: string;
  rolloutPercentage?: number;
}
