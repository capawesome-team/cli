export interface AppDestinationDto {
  id: string;
  appId: string;
  name: string;
  platform?: 'ios' | 'android' | 'web';
}

export interface FindAllAppDestinationsDto {
  appId: string;
  platform?: 'ios' | 'android' | 'web';
}
