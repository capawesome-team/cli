export interface AppDto {
  id: string;
  name: string;
}

export interface CreateAppDto {
  name: string;
  organizationId: string;
}

export interface DeleteAppDto {
  id: string;
}

export interface FindAllAppsDto {
  organizationId: string;
}
