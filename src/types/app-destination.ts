export interface AppDestinationDto {
  id: string;
  appId: string;
  name: string;
  platform?: 'ios' | 'android';
  createdAt?: number;
  createdBy?: string;
}

export interface FindAllAppDestinationsDto {
  appId: string;
  platform?: 'ios' | 'android';
}
