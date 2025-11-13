import authorizationService from '@/services/authorization-service.js';
import { AppBuildDto, CreateAppBuildDto, FindAllAppBuildsDto, FindOneAppBuildDto } from '@/types/app-build.js';
import httpClient, { HttpClient } from '@/utils/http-client.js';

export interface AppBuildsService {
  create(dto: CreateAppBuildDto): Promise<AppBuildDto>;
  findAll(dto: FindAllAppBuildsDto): Promise<AppBuildDto[]>;
  findOne(dto: FindOneAppBuildDto): Promise<AppBuildDto>;
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

  async findAll(dto: FindAllAppBuildsDto): Promise<AppBuildDto[]> {
    const { appId } = dto;
    const response = await this.httpClient.get<AppBuildDto[]>(`/v1/apps/${appId}/builds`, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
    return response.data;
  }

  async findOne(dto: FindOneAppBuildDto): Promise<AppBuildDto> {
    const { appId, appBuildId } = dto;
    const response = await this.httpClient.get<AppBuildDto>(`/v1/apps/${appId}/builds/${appBuildId}`, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
    return response.data;
  }
}

const appBuildsService = new AppBuildsServiceImpl(httpClient);

export default appBuildsService;
