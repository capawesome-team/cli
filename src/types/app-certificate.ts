export interface AppCertificateDto {
  id: string;
  appId: string;
  name: string;
}

export interface FindAllAppCertificatesDto {
  appId: string;
  platform?: 'android' | 'ios' | 'web';
}
