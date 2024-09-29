import FormData from 'form-data';

export interface AppBundleDto {
  id: string;
}

export interface CreateAppBundleDto {
  appId: string;
  formData: FormData;
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
  artifactStatus?: 'uploading' | 'uploaded';
  maxAndroidAppVersionCode?: string;
  maxIosAppVersionCode?: string;
  minAndroidAppVersionCode?: string;
  minIosAppVersionCode?: string;
  rolloutPercentage?: number;
}
