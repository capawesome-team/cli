import authorizationService from '@/services/authorization-service.js';
import {
  AppConfigurationDto,
  CreateAppConfigurationDto,
  DeleteAppConfigurationDto,
  FindAllAppConfigurationsDto,
  FindOneAppConfigurationByIdDto,
  UpdateAppConfigurationDto,
} from '@/types/app-configuration.js';
import httpClient, { HttpClient } from '@/utils/http-client.js';

export interface AppConfigurationsService {
  create(dto: CreateAppConfigurationDto): Promise<AppConfigurationDto>;
  delete(dto: DeleteAppConfigurationDto): Promise<void>;
  findAll(dto: FindAllAppConfigurationsDto): Promise<AppConfigurationDto[]>;
  findOneById(dto: FindOneAppConfigurationByIdDto): Promise<AppConfigurationDto>;
  update(dto: UpdateAppConfigurationDto): Promise<AppConfigurationDto>;
}

class AppConfigurationsServiceImpl implements AppConfigurationsService {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async create(dto: CreateAppConfigurationDto): Promise<AppConfigurationDto> {
    const { appId, ...bodyData } = dto;
    const response = await this.httpClient.post<AppConfigurationDto>(`/v1/apps/${appId}/configurations`, bodyData, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
    return response.data;
  }

  async delete(dto: DeleteAppConfigurationDto): Promise<void> {
    if (dto.id) {
      await this.httpClient.delete(`/v1/apps/${dto.appId}/configurations/${dto.id}`, {
        headers: {
          Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
        },
      });
    } else if (dto.name) {
      await this.httpClient.delete(`/v1/apps/${dto.appId}/configurations`, {
        headers: {
          Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
        },
        params: {
          name: dto.name,
        },
      });
    }
  }

  async findAll(dto: FindAllAppConfigurationsDto): Promise<AppConfigurationDto[]> {
    const params: Record<string, string> = {};
    if (dto.limit !== undefined) {
      params.limit = dto.limit.toString();
    }
    if (dto.name) {
      params.name = dto.name;
    }
    if (dto.offset !== undefined) {
      params.offset = dto.offset.toString();
    }
    if (dto.query) {
      params.query = dto.query;
    }
    const response = await this.httpClient.get<AppConfigurationDto[]>(`/v1/apps/${dto.appId}/configurations`, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
      params,
    });
    return response.data;
  }

  async findOneById(dto: FindOneAppConfigurationByIdDto): Promise<AppConfigurationDto> {
    const response = await this.httpClient.get<AppConfigurationDto>(`/v1/apps/${dto.appId}/configurations/${dto.id}`, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
    return response.data;
  }

  async update(dto: UpdateAppConfigurationDto): Promise<AppConfigurationDto> {
    const { appId, configurationId, ...bodyData } = dto;
    const response = await this.httpClient.patch<AppConfigurationDto>(
      `/v1/apps/${appId}/configurations/${configurationId}`,
      bodyData,
      {
        headers: {
          Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
        },
      },
    );
    return response.data;
  }
}

const appConfigurationsService = new AppConfigurationsServiceImpl(httpClient);

export default appConfigurationsService;
