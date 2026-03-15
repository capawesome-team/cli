export interface AppAppleApiKeyDto {
  id: string;
  appId: string;
}

export interface CreateAppAppleApiKeyDto {
  appId: string;
  buffer: Buffer;
  fileName: string;
}
