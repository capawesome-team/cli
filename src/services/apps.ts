import authorizationService from '@/services/authorization-service.js';
import {
  AppDto,
  CreateAppDto,
  DeleteAppDto,
  FindAllAppsDto,
  FindOneAppDto,
  LinkAppRepositoryDto,
  UnlinkAppRepositoryDto,
} from '@/types/app.js';
import httpClient, { HttpClient } from '@/utils/http-client.js';

export interface AppsService {
  create(dto: CreateAppDto): Promise<AppDto>;
  delete(dto: DeleteAppDto): Promise<void>;
  findAll(dto: FindAllAppsDto): Promise<AppDto[]>;
  findOne(dto: FindOneAppDto): Promise<AppDto>;
  linkRepository(dto: LinkAppRepositoryDto): Promise<AppDto>;
  unlinkRepository(dto: UnlinkAppRepositoryDto): Promise<void>;
}

class AppsServiceImpl implements AppsService {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async create(dto: CreateAppDto): Promise<AppDto> {
    const params = new URLSearchParams({ organizationId: dto.organizationId });
    const { organizationId, ...bodyData } = dto;
    const response = await this.httpClient.post<AppDto>(`/v1/apps?${params.toString()}`, bodyData, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
    return response.data;
  }

  async delete(dto: DeleteAppDto): Promise<void> {
    await this.httpClient.delete(`/v1/apps/${dto.id}`, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
  }

  async findAll(dto: FindAllAppsDto): Promise<AppDto[]> {
    const params = new URLSearchParams({ organizationId: dto.organizationId });
    if (dto.limit !== undefined) {
      params.append('limit', dto.limit.toString());
    }
    const response = await this.httpClient.get<AppDto[]>(`/v1/apps?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
    return response.data;
  }

  async findOne(dto: FindOneAppDto): Promise<AppDto> {
    const response = await this.httpClient.get<AppDto>(`/v1/apps/${dto.appId}`, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
    return response.data;
  }

  async linkRepository(dto: LinkAppRepositoryDto): Promise<AppDto> {
    const { appId, ...bodyData } = dto;
    const response = await this.httpClient.put<AppDto>(`/v1/apps/${appId}/repository`, bodyData, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
    return response.data;
  }

  async unlinkRepository(dto: UnlinkAppRepositoryDto): Promise<void> {
    await this.httpClient.delete(`/v1/apps/${dto.appId}/repository`, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
  }
}

const appsService = new AppsServiceImpl(httpClient);

export default appsService;
