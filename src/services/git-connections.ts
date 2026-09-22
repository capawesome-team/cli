import authorizationService from '@/services/authorization-service.js';
import { FindAllGitConnectionsDto, GitConnectionDto } from '@/types/git-connection.js';
import httpClient, { HttpClient } from '@/utils/http-client.js';

export interface GitConnectionsService {
  findAll(dto: FindAllGitConnectionsDto): Promise<GitConnectionDto[]>;
}

class GitConnectionsServiceImpl implements GitConnectionsService {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async findAll(dto: FindAllGitConnectionsDto): Promise<GitConnectionDto[]> {
    const params: Record<string, string> = {};
    if (dto.limit !== undefined) {
      params.limit = dto.limit.toString();
    }
    if (dto.offset !== undefined) {
      params.offset = dto.offset.toString();
    }
    if (dto.provider !== undefined) {
      params.provider = dto.provider;
    }
    if (dto.restricted !== undefined) {
      params.restricted = dto.restricted.toString();
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
}

const gitConnectionsService = new GitConnectionsServiceImpl(httpClient);

export default gitConnectionsService;
