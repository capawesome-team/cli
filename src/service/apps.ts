import { AppDto, CreateAppDto, DeleteAppDto } from "../types/app";
import httpClient, { HttpClient } from "../utils/http-client";
import authorizationService from "./authorization-service";

export interface AppsService {
  create(dto: CreateAppDto): Promise<AppDto>;
  delete(dto: DeleteAppDto): Promise<void>;
  findAll(): Promise<AppDto[]>;
}

class AppsServiceImpl implements AppsService {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async create(dto: CreateAppDto): Promise<AppDto> {
    const response = await this.httpClient.post<AppDto>(`/apps`, dto, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
    if (!response.success) {
      throw response.error;
    }
    return response.data;
  }

  async delete(dto: DeleteAppDto): Promise<void> {
    const response = await this.httpClient.delete(`/apps/${dto.id}`, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
    if (!response.success) {
      throw response.error;
    }
  }

  async findAll(): Promise<AppDto[]> {
    const response = await this.httpClient.get<AppDto[]>("/apps", {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
    if (!response.success) {
      throw response.error;
    }
    return response.data;
  }
}

const appsService = new AppsServiceImpl(httpClient);

export default appsService;
