import authorizationService from '@/services/authorization-service.js';
import {
  AppEnvironmentDto,
  CreateAppEnvironmentDto,
  DeleteAppEnvironmentDto,
  FindAllAppEnvironmentsDto,
  SetEnvironmentSecretsDto,
  SetEnvironmentVariablesDto,
  UnsetEnvironmentSecretsDto,
  UnsetEnvironmentVariablesDto,
} from '@/types/app-environment.js';
import httpClient, { HttpClient } from '@/utils/http-client.js';

export interface AppEnvironmentsService {
  create(dto: CreateAppEnvironmentDto): Promise<AppEnvironmentDto>;
  delete(dto: DeleteAppEnvironmentDto): Promise<void>;
  findAll(dto: FindAllAppEnvironmentsDto): Promise<AppEnvironmentDto[]>;
  setVariables(dto: SetEnvironmentVariablesDto): Promise<void>;
  setSecrets(dto: SetEnvironmentSecretsDto): Promise<void>;
  unsetVariables(dto: UnsetEnvironmentVariablesDto): Promise<void>;
  unsetSecrets(dto: UnsetEnvironmentSecretsDto): Promise<void>;
}

class AppEnvironmentsServiceImpl implements AppEnvironmentsService {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async create(dto: CreateAppEnvironmentDto): Promise<AppEnvironmentDto> {
    const response = await this.httpClient.post<AppEnvironmentDto>(`/v1/apps/${dto.appId}/environments`, dto, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
    return response.data;
  }

  async delete(dto: DeleteAppEnvironmentDto): Promise<void> {
    if (dto.id) {
      await this.httpClient.delete(`/v1/apps/${dto.appId}/environments/${dto.id}`, {
        headers: {
          Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
        },
      });
    } else if (dto.name) {
      await this.httpClient.delete(`/v1/apps/${dto.appId}/environments`, {
        headers: {
          Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
        },
        params: {
          name: dto.name,
        },
      });
    }
  }

  async findAll(dto: FindAllAppEnvironmentsDto): Promise<AppEnvironmentDto[]> {
    const queryParams = new URLSearchParams();
    if (dto.limit) {
      queryParams.append('limit', dto.limit.toString());
    }
    if (dto.offset) {
      queryParams.append('offset', dto.offset.toString());
    }
    const queryString = queryParams.toString();
    const url = queryString
      ? `/v1/apps/${dto.appId}/environments?${queryString}`
      : `/v1/apps/${dto.appId}/environments`;
    const response = await this.httpClient.get<AppEnvironmentDto[]>(
      url,
      {
        headers: {
          Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
        },
      },
    );
    return response.data;
  }

  async setVariables(dto: SetEnvironmentVariablesDto): Promise<void> {
    await this.httpClient.post(`/v1/apps/${dto.appId}/environments/${dto.environmentId}/variables/set`, dto.variables, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
  }

  async setSecrets(dto: SetEnvironmentSecretsDto): Promise<void> {
    await this.httpClient.post(`/v1/apps/${dto.appId}/environments/${dto.environmentId}/secrets/set`, dto.secrets, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
  }

  async unsetVariables(dto: UnsetEnvironmentVariablesDto): Promise<void> {
    await this.httpClient.post(`/v1/apps/${dto.appId}/environments/${dto.environmentId}/variables/unset`, dto.keys, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
  }

  async unsetSecrets(dto: UnsetEnvironmentSecretsDto): Promise<void> {
    await this.httpClient.post(`/v1/apps/${dto.appId}/environments/${dto.environmentId}/secrets/unset`, dto.keys, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
  }
}

const appEnvironmentsService = new AppEnvironmentsServiceImpl(httpClient);

export default appEnvironmentsService;
