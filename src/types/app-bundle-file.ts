export interface AppBundleFileDto {
  id: string;
}

export interface CreateAppBundleFileDto {
  appId: string;
  appBundleId: string;
  buffer: Buffer;
  checksum: string;
  href?: string;
  mimeType: string;
  name: string;
  signature?: string;
  sizeInBytes?: number;
}
