export interface AppGoogleServiceAccountKeyDto {
  id: string;
  appId: string;
}

export interface CreateAppGoogleServiceAccountKeyDto {
  appId: string;
  buffer: Buffer;
  fileName: string;
}
