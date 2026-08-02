import authorizationService from '@/services/authorization-service.js';
import {
  AppAutomationDto,
  CreateAppAutomationDto,
  DeleteAppAutomationDto,
  FindAllAppAutomationsDto,
  FindOneAppAutomationByIdDto,
  UpdateAppAutomationDto,
} from '@/types/app-automation.js';
import httpClient, { HttpClient } from '@/utils/http-client.js';

export interface AppAutomationsService {
  create(dto: CreateAppAutomationDto): Promise<AppAutomationDto>;
  delete(dto: DeleteAppAutomationDto): Promise<void>;
  findAll(dto: FindAllAppAutomationsDto): Promise<AppAutomationDto[]>;
  findOneById(dto: FindOneAppAutomationByIdDto): Promise<AppAutomationDto>;
  update(dto: UpdateAppAutomationDto): Promise<void>;
}

class AppAutomationsServiceImpl implements AppAutomationsService {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async create(dto: CreateAppAutomationDto): Promise<AppAutomationDto> {
    const { appId, ...bodyData } = dto;
    const response = await this.httpClient.post<AppAutomationDto>(`/v1/apps/${appId}/automations`, bodyData, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
    return response.data;
  }

  async delete(dto: DeleteAppAutomationDto): Promise<void> {
    await this.httpClient.delete(`/v1/apps/${dto.appId}/automations/${dto.automationId}`, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
  }

  async findAll(dto: FindAllAppAutomationsDto): Promise<AppAutomationDto[]> {
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
    if (dto.platform) {
      params.platform = dto.platform;
    }
    const response = await this.httpClient.get<AppAutomationDto[]>(`/v1/apps/${dto.appId}/automations`, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
      params,
    });
    return response.data;
  }

  async findOneById(dto: FindOneAppAutomationByIdDto): Promise<AppAutomationDto> {
    const response = await this.httpClient.get<AppAutomationDto>(
      `/v1/apps/${dto.appId}/automations/${dto.automationId}`,
      {
        headers: {
          Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
        },
      },
    );
    return response.data;
  }

  async update(dto: UpdateAppAutomationDto): Promise<void> {
    const { appId, automationId, ...bodyData } = dto;
    await this.httpClient.patch(`/v1/apps/${appId}/automations/${automationId}`, bodyData, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
  }
}

const appAutomationsService = new AppAutomationsServiceImpl(httpClient);

export default appAutomationsService;
