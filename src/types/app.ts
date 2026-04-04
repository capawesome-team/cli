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
  limit?: number;
}

export interface FindOneAppDto {
  appId: string;
}

export interface LinkAppRepositoryDto {
  appId: string;
  ownerSlug: string;
  provider: string;
  repositorySlug: string;
  projectSlug?: string;
}

export interface TransferAppDto {
  appId: string;
  organizationId: string;
}

export interface UnlinkAppRepositoryDto {
  appId: string;
}
