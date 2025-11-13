import authorizationService from '@/services/authorization-service.js';
import { AppBuildDto, CreateAppBuildDto } from '@/types/app-build.js';
import httpClient, { HttpClient } from '@/utils/http-client.js';

export interface AppBuildsService {
  create(dto: CreateAppBuildDto): Promise<AppBuildDto>;
}

class AppBuildsServiceImpl implements AppBuildsService {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async create(dto: CreateAppBuildDto): Promise<AppBuildDto> {
    const { appId, ...bodyData } = dto;
    const response = await this.httpClient.post<AppBuildDto>(`/v1/apps/${appId}/builds`, bodyData, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
    return response.data;
  }
}

const appBuildsService = new AppBuildsServiceImpl(httpClient);

export default appBuildsService;
