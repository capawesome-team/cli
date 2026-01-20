import {
  AppChannelDto,
  CreateAppChannelDto,
  DeleteAppChannelDto,
  FindAllAppChannelsDto,
  FindOneAppChannelByIdDto,
  PauseAppChannelDto,
  ResumeAppChannelDto,
  UpdateAppChannelDto,
} from '@/types/index.js';
import httpClient, { HttpClient } from '@/utils/http-client.js';
import authorizationService from '@/services/authorization-service.js';

export interface AppChannelsService {
  create(dto: CreateAppChannelDto): Promise<AppChannelDto>;
  delete(dto: DeleteAppChannelDto): Promise<void>;
  findAll(dto: FindAllAppChannelsDto): Promise<AppChannelDto[]>;
  findOneById(dto: FindOneAppChannelByIdDto): Promise<AppChannelDto>;
  pause(dto: PauseAppChannelDto): Promise<void>;
  resume(dto: ResumeAppChannelDto): Promise<void>;
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

  async findAll(dto: FindAllAppChannelsDto): Promise<AppChannelDto[]> {
    const queryParams = new URLSearchParams();
    if (dto.limit) {
      queryParams.append('limit', dto.limit.toString());
    }
    if (dto.name) {
      queryParams.append('name', dto.name);
    }
    if (dto.offset) {
      queryParams.append('offset', dto.offset.toString());
    }
    const response = await this.httpClient.get<AppChannelDto[]>(`/v1/apps/${dto.appId}/channels?${queryParams}`, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
    return response.data;
  }

  async findOneById(data: FindOneAppChannelByIdDto): Promise<AppChannelDto> {
    const params: Record<string, string> = {};
    if (data.relations) {
      params.relations = data.relations;
    }
    const response = await this.httpClient.get<AppChannelDto>(`/v1/apps/${data.appId}/channels/${data.id}`, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
      params,
    });
    return response.data;
  }

  async pause(dto: PauseAppChannelDto): Promise<void> {
    await this.httpClient.post(
      `/v1/apps/${dto.appId}/channels/${dto.channelId}/pause`,
      {},
      {
        headers: {
          Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
        },
      },
    );
  }

  async resume(dto: ResumeAppChannelDto): Promise<void> {
    await this.httpClient.post(
      `/v1/apps/${dto.appId}/channels/${dto.channelId}/resume`,
      {},
      {
        headers: {
          Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
        },
      },
    );
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
