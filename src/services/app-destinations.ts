import authorizationService from '@/services/authorization-service.js';
import {
  AppDestinationDto,
  CreateAppDestinationDto,
  DeleteAppDestinationDto,
  FindAllAppDestinationsDto,
  FindOneAppDestinationDto,
  UpdateAppDestinationDto,
} from '@/types/app-destination.js';
import httpClient, { HttpClient } from '@/utils/http-client.js';

export interface AppDestinationsService {
  create(dto: CreateAppDestinationDto): Promise<AppDestinationDto>;
  delete(dto: DeleteAppDestinationDto): Promise<void>;
  findAll(dto: FindAllAppDestinationsDto): Promise<AppDestinationDto[]>;
  findOneById(dto: FindOneAppDestinationDto): Promise<AppDestinationDto>;
  update(dto: UpdateAppDestinationDto): Promise<AppDestinationDto>;
}

class AppDestinationsServiceImpl implements AppDestinationsService {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async create(dto: CreateAppDestinationDto): Promise<AppDestinationDto> {
    const response = await this.httpClient.post<AppDestinationDto>(`/v1/apps/${dto.appId}/destinations`, dto, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
    return response.data;
  }

  async delete(dto: DeleteAppDestinationDto): Promise<void> {
    await this.httpClient.delete(`/v1/apps/${dto.appId}/destinations/${dto.destinationId}`, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
  }

  async findAll(dto: FindAllAppDestinationsDto): Promise<AppDestinationDto[]> {
    const params: Record<string, string> = {};
    if (dto.limit !== undefined) {
      params.limit = dto.limit.toString();
    }
    if (dto.offset !== undefined) {
      params.offset = dto.offset.toString();
    }
    if (dto.name) {
      params.name = dto.name;
    }
    if (dto.platform) {
      params.platform = dto.platform;
    }
    if (dto.query) {
      params.query = dto.query;
    }
    const response = await this.httpClient.get<AppDestinationDto[]>(`/v1/apps/${dto.appId}/destinations`, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
      params,
    });
    return response.data;
  }

  async findOneById(dto: FindOneAppDestinationDto): Promise<AppDestinationDto> {
    const response = await this.httpClient.get<AppDestinationDto>(
      `/v1/apps/${dto.appId}/destinations/${dto.destinationId}`,
      {
        headers: {
          Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
        },
      },
    );
    return response.data;
  }

  async update(dto: UpdateAppDestinationDto): Promise<AppDestinationDto> {
    const response = await this.httpClient.patch<AppDestinationDto>(
      `/v1/apps/${dto.appId}/destinations/${dto.destinationId}`,
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

const appDestinationsService = new AppDestinationsServiceImpl(httpClient);

export default appDestinationsService;
