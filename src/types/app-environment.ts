export interface AppEnvironmentDto {
  id: string;
  appId: string;
  name: string;
  createdAt?: number;
  createdBy?: string;
}

export interface FindAllAppEnvironmentsDto {
  appId: string;
}
