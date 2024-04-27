import { AppChannelDto, CreateAppChannelDto, DeleteAppChannelDto } from '../types';
import httpClient, { HttpClient } from '../utils/http-client';
import authorizationService from './authorization-service';

export interface AppChannelsService {
  create(dto: CreateAppChannelDto): Promise<AppChannelDto>;
  delete(dto: DeleteAppChannelDto): Promise<void>;
}

class AppChannelsServiceImpl implements AppChannelsService {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async create(dto: CreateAppChannelDto): Promise<AppChannelDto> {
    const response = await this.httpClient.post<AppChannelDto>(`/apps/${dto.appId}/channels`, dto, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
    if (!response.success) {
      throw response.error;
    }
    return response.data;
  }

  async delete(data: DeleteAppChannelDto): Promise<void> {
    const response = await this.httpClient.delete(`/apps/${data.appId}/channels`, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
      params: {
        name: data.name,
      },
    });
    if (!response.success) {
      throw response.error;
    }
  }
}

const appChannelsService: AppChannelsService = new AppChannelsServiceImpl(httpClient);

export default appChannelsService;
