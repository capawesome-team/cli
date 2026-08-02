export interface AppConfigurationDto {
  id: string;
  appId: string;
  name: string;
  displayName: string | null;
  packageName: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface CreateAppConfigurationDto {
  appId: string;
  name: string;
  displayName?: string | null;
  packageName?: string | null;
}

export interface UpdateAppConfigurationDto {
  appId: string;
  configurationId: string;
  name?: string;
  displayName?: string | null;
  packageName?: string | null;
}

export interface DeleteAppConfigurationDto {
  appId: string;
  id?: string;
  name?: string;
}

export interface FindAllAppConfigurationsDto {
  appId: string;
  limit?: number;
  name?: string;
  offset?: number;
  query?: string;
}

export interface FindOneAppConfigurationByIdDto {
  appId: string;
  id: string;
}
