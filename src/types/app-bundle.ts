import FormData from 'form-data';

export interface CreateAppBundleDto {
  appId: string;
  formData: FormData;
}

export interface DeleteAppBundleDto {
  appId: string;
  bundleId: string;
}
