export interface OrganizationDto {
  id: string;
  name: string;
}

export interface CreateOrganizationDto {
  name: string;
}

export interface FindAllOrganizationsDto {
  limit?: number;
  offset?: number;
}

export interface FindOneOrganizationDto {
  organizationId: string;
}
