export interface AppBundleFileDto {
  id: string;
}

export interface CreateAppBundleFileDto {
  appId: string;
  appBundleId: string;
  buffer: Buffer;
  checksum: string;
  href?: string;
  name: string;
  signature?: string;
}

export interface UploadAppBundleFileDto {
  appId: string;
  appBundleId: string;
  checksum: string;
  fileBuffer: Buffer;
  fileName: string;
  href?: string;
  mimeType: string;
  signature?: string;
}
