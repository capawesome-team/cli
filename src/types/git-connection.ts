export type GitConnectionAuthKind = 'basic' | 'github_app' | 'oauth' | 'token';

export type GitConnectionProvider = 'azure_devops' | 'bitbucket' | 'git_http' | 'gitea' | 'github' | 'gitlab';

export interface GitConnectionDto {
  id: string;
  appId: string | null;
  authKind: GitConnectionAuthKind;
  baseUrl: string | null;
  name: string;
  organizationId: string;
  provider: GitConnectionProvider;
}

export interface FindAllGitConnectionsDto {
  organizationId: string;
  appId?: string;
  limit?: number;
  name?: string;
  offset?: number;
  provider?: GitConnectionProvider;
  scope?: 'organization';
}

export interface ResolveGitConnectionsDto {
  organizationId: string;
  remoteUrl: string;
  appId?: string;
}

export interface GitConnectionResolutionDto {
  gitConnections: GitConnectionDto[];
  path: string;
  provider: GitConnectionProvider | null;
}

export interface FindAllGitConnectionRepositoriesDto {
  gitConnectionId: string;
  organizationId: string;
  namespace?: string;
  path?: string;
  query?: string;
}

export interface GitConnectionRepositoryDto {
  defaultBranch: string;
  id: string;
  name: string;
  namespace: string;
  path: string;
  private: boolean;
  webUrl: string;
}
