import { AppDto, CreateAppDto, DeleteAppDto } from '../types/app';
import httpClient, { HttpClient } from '../utils/http-client';
import authorizationService from './authorization-service';

export interface AppsService {
  create(dto: CreateAppDto): Promise<AppDto>;
  delete(dto: DeleteAppDto): Promise<void>;
  findAll(): Promise<AppDto[]>;
}

class AppsServiceImpl implements AppsService {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async create(dto: CreateAppDto): Promise<AppDto> {
    const response = await this.httpClient.post<AppDto>(`/v1/apps`, dto, {
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

  async findAll(): Promise<AppDto[]> {
    const response = await this.httpClient.get<AppDto[]>('/v1/apps', {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
    return response.data;
  }
}

const appsService = new AppsServiceImpl(httpClient);

export default appsService;
