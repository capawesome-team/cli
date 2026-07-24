import authorizationService from '@/services/authorization-service.js';
import {
  FindAllGitConnectionRepositoriesDto,
  FindAllGitConnectionsDto,
  GitConnectionDto,
  GitConnectionRepositoryDto,
} from '@/types/git-connection.js';
import httpClient, { HttpClient } from '@/utils/http-client.js';

export interface GitConnectionsService {
  findAll(dto: FindAllGitConnectionsDto): Promise<GitConnectionDto[]>;
  findAllRepositories(dto: FindAllGitConnectionRepositoriesDto): Promise<GitConnectionRepositoryDto[]>;
}

class GitConnectionsServiceImpl implements GitConnectionsService {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async findAll(dto: FindAllGitConnectionsDto): Promise<GitConnectionDto[]> {
    const params: Record<string, string> = {};
    if (dto.appId !== undefined) {
      params.appId = dto.appId;
    }
    if (dto.limit !== undefined) {
      params.limit = dto.limit.toString();
    }
    if (dto.name !== undefined) {
      params.name = dto.name;
    }
    if (dto.offset !== undefined) {
      params.offset = dto.offset.toString();
    }
    if (dto.provider !== undefined) {
      params.provider = dto.provider;
    }
    if (dto.scope !== undefined) {
      params.scope = dto.scope;
    }
    const response = await this.httpClient.get<GitConnectionDto[]>(
      `/v1/organizations/${dto.organizationId}/git-connections`,
      {
        headers: {
          Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
        },
        params,
      },
    );
    return response.data;
  }

  async findAllRepositories(dto: FindAllGitConnectionRepositoriesDto): Promise<GitConnectionRepositoryDto[]> {
    const params: Record<string, string> = {};
    if (dto.namespace !== undefined) {
      params.namespace = dto.namespace;
    }
    if (dto.path !== undefined) {
      params.path = dto.path;
    }
    if (dto.query !== undefined) {
      params.query = dto.query;
    }
    const response = await this.httpClient.get<GitConnectionRepositoryDto[]>(
      `/v1/organizations/${dto.organizationId}/git-connections/${dto.gitConnectionId}/repositories`,
      {
        headers: {
          Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
        },
        params,
      },
    );
    return response.data;
  }
}

const gitConnectionsService = new GitConnectionsServiceImpl(httpClient);

export default gitConnectionsService;
