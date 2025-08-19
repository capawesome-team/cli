import authorizationService from '@/services/authorization-service.js';
import { AppDto, CreateAppDto, DeleteAppDto, FindAllAppsDto } from '@/types/app.js';
import httpClient, { HttpClient } from '@/utils/http-client.js';

export interface AppsService {
  create(dto: CreateAppDto): Promise<AppDto>;
  delete(dto: DeleteAppDto): Promise<void>;
  findAll(dto: FindAllAppsDto): Promise<AppDto[]>;
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
    const response = await this.httpClient.get<AppDto[]>(`/v1/apps?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
    return response.data;
  }
}

const appsService = new AppsServiceImpl(httpClient);

export default appsService;
