import authorizationService from '@/services/authorization-service.js';
import { AppAppleApiKeyDto, CreateAppAppleApiKeyDto } from '@/types/app-apple-api-key.js';
import httpClient, { HttpClient } from '@/utils/http-client.js';
import FormData from 'form-data';

export interface AppAppleApiKeysService {
  create(dto: CreateAppAppleApiKeyDto): Promise<AppAppleApiKeyDto>;
}

class AppAppleApiKeysServiceImpl implements AppAppleApiKeysService {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async create(dto: CreateAppAppleApiKeyDto): Promise<AppAppleApiKeyDto> {
    const formData = new FormData();
    formData.append('file', dto.buffer, { filename: dto.fileName });
    const response = await this.httpClient.post<AppAppleApiKeyDto>(`/v1/apps/${dto.appId}/apple-api-keys`, formData, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
        ...formData.getHeaders(),
      },
    });
    return response.data;
  }
}

const appAppleApiKeysService = new AppAppleApiKeysServiceImpl(httpClient);

export default appAppleApiKeysService;
