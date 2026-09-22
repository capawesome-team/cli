export interface GitConnectionDto {
  id: string;
  name: string;
  provider: string;
}

export interface FindAllGitConnectionsDto {
  organizationId: string;
  limit?: number;
  offset?: number;
  provider?: string;
}
