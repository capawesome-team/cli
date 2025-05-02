import { AppChannelDto, CreateAppChannelDto, DeleteAppChannelDto, UpdateAppChannelDto } from '../types';
import httpClient, { HttpClient } from '../utils/http-client';
import authorizationService from './authorization-service';

export interface AppChannelsService {
  create(dto: CreateAppChannelDto): Promise<AppChannelDto>;
  delete(dto: DeleteAppChannelDto): Promise<void>;
  update(dto: UpdateAppChannelDto): Promise<AppChannelDto>;
}

class AppChannelsServiceImpl implements AppChannelsService {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async create(dto: CreateAppChannelDto): Promise<AppChannelDto> {
    const response = await this.httpClient.post<AppChannelDto>(`/v1/apps/${dto.appId}/channels`, dto, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
    return response.data;
  }

  async delete(data: DeleteAppChannelDto): Promise<void> {
    if (data.id) {
      await this.httpClient.delete(`/v1/apps/${data.appId}/channels/${data.id}`, {
        headers: {
          Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
        },
      });
    } else if (data.name) {
      await this.httpClient.delete(`/v1/apps/${data.appId}/channels`, {
        headers: {
          Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
        },
        params: {
          name: data.name,
        },
      });
    }
  }

  async update(dto: UpdateAppChannelDto): Promise<AppChannelDto> {
    const response = await this.httpClient.patch<AppChannelDto>(
      `/v1/apps/${dto.appId}/channels/${dto.appChannelId}`,
      dto,
      {
        headers: {
          Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
        },
      },
    );
    return response.data;
  }
}

const appChannelsService: AppChannelsService = new AppChannelsServiceImpl(httpClient);

export default appChannelsService;
