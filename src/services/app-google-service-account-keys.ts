import authorizationService from '@/services/authorization-service.js';
import {
  AppGoogleServiceAccountKeyDto,
  CreateAppGoogleServiceAccountKeyDto,
} from '@/types/app-google-service-account-key.js';
import httpClient, { HttpClient } from '@/utils/http-client.js';
import FormData from 'form-data';

export interface AppGoogleServiceAccountKeysService {
  create(dto: CreateAppGoogleServiceAccountKeyDto): Promise<AppGoogleServiceAccountKeyDto>;
}

class AppGoogleServiceAccountKeysServiceImpl implements AppGoogleServiceAccountKeysService {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async create(dto: CreateAppGoogleServiceAccountKeyDto): Promise<AppGoogleServiceAccountKeyDto> {
    const formData = new FormData();
    formData.append('file', dto.buffer, { filename: dto.fileName });
    const response = await this.httpClient.post<AppGoogleServiceAccountKeyDto>(
      `/v1/apps/${dto.appId}/google-service-account-keys`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
          ...formData.getHeaders(),
        },
      },
    );
    return response.data;
  }
}

const appGoogleServiceAccountKeysService = new AppGoogleServiceAccountKeysServiceImpl(httpClient);

export default appGoogleServiceAccountKeysService;
