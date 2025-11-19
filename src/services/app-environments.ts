import authorizationService from '@/services/authorization-service.js';
import { AppEnvironmentDto, FindAllAppEnvironmentsDto } from '@/types/app-environment.js';
import httpClient, { HttpClient } from '@/utils/http-client.js';

export interface AppEnvironmentsService {
  findAll(dto: FindAllAppEnvironmentsDto): Promise<AppEnvironmentDto[]>;
}

class AppEnvironmentsServiceImpl implements AppEnvironmentsService {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async findAll(dto: FindAllAppEnvironmentsDto): Promise<AppEnvironmentDto[]> {
    const { appId } = dto;
    const response = await this.httpClient.get<AppEnvironmentDto[]>(`/v1/apps/${appId}/environments`, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
    return response.data;
  }
}

const appEnvironmentsService = new AppEnvironmentsServiceImpl(httpClient);

export default appEnvironmentsService;
