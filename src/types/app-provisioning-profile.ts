export interface AppProvisioningProfileDto {
  id: string;
  appCertificateId: string;
  appId: string;
  fileMimeType: string;
  fileName: string;
  fileSizeInBytes: number;
  createdAt: string;
  createdBy: string;
}

export interface CreateAppProvisioningProfileDto {
  appId: string;
  buffer: Buffer;
  fileName: string;
  certificateId?: string;
}

export interface UpdateAppProvisioningProfilesDto {
  appId: string;
  ids: string[];
  appCertificateId: string;
}
