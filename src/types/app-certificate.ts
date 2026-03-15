export interface AppCertificateDto {
  id: string;
  appId: string;
  name: string;
  nameLower: string;
  platform: 'android' | 'ios' | 'web';
  type: 'development' | 'production';
  fileMimeType: string;
  fileName: string;
  fileSizeInBytes: number;
  expiresAt: string | null;
  keyAlias: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface CreateAppCertificateDto {
  appId: string;
  buffer: Buffer;
  fileName: string;
  name: string;
  platform: 'android' | 'ios' | 'web';
  type: 'development' | 'production';
  password?: string;
  keyAlias?: string;
  keyPassword?: string;
}

export interface UpdateAppCertificateDto {
  appId: string;
  certificateId: string;
  name?: string;
  type?: 'development' | 'production';
  password?: string;
  keyAlias?: string;
  keyPassword?: string;
}

export interface DeleteAppCertificateDto {
  appId: string;
  certificateId: string;
}

export interface FindOneAppCertificateDto {
  appId: string;
  certificateId: string;
}

export interface FindAllAppCertificatesDto {
  appId: string;
  limit?: number;
  name?: string;
  offset?: number;
  platform?: 'android' | 'ios' | 'web';
  type?: 'development' | 'production';
  query?: string;
}
