export interface AppBundleFileDto {
  id: string;
}

export interface CreateAppBundleFileDto {
  appId: string;
  appBundleId: string;
  checksum: string;
  fileBuffer: Buffer;
  fileName: string;
  href?: string;
  signature?: string;
}
