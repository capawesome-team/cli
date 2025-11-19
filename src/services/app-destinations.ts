import authorizationService from '@/services/authorization-service.js';
import { AppDestinationDto, FindAllAppDestinationsDto } from '@/types/app-destination.js';
import httpClient, { HttpClient } from '@/utils/http-client.js';

export interface AppDestinationsService {
  findAll(dto: FindAllAppDestinationsDto): Promise<AppDestinationDto[]>;
}

class AppDestinationsServiceImpl implements AppDestinationsService {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async findAll(dto: FindAllAppDestinationsDto): Promise<AppDestinationDto[]> {
    const { appId, platform } = dto;
    const params: Record<string, string> = {};
    if (platform) {
      params.platform = platform;
    }
    const response = await this.httpClient.get<AppDestinationDto[]>(`/v1/apps/${appId}/destinations`, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
      params,
    });
    return response.data;
  }
}

const appDestinationsService = new AppDestinationsServiceImpl(httpClient);

export default appDestinationsService;
