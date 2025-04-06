import { AppBundleDto, CreateAppBundleDto, DeleteAppBundleDto, UpdateAppBundleDto } from '../types';
import httpClient, { HttpClient } from '../utils/http-client';
import authorizationService from './authorization-service';

export interface AppBundlesService {
  create(dto: CreateAppBundleDto): Promise<AppBundleDto>;
  delete(dto: DeleteAppBundleDto): Promise<void>;
  update(dto: UpdateAppBundleDto): Promise<AppBundleDto>;
}

class AppBundlesServiceImpl implements AppBundlesService {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async create(dto: CreateAppBundleDto): Promise<AppBundleDto> {
    const response = await this.httpClient.post<AppBundleDto>(`/v1/apps/${dto.appId}/bundles`, dto, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
    return response.data;
  }

  async update(dto: UpdateAppBundleDto): Promise<AppBundleDto> {
    const response = await this.httpClient.patch<AppBundleDto>(
      `/v1/apps/${dto.appId}/bundles/${dto.appBundleId}`,
      dto,
      {
        headers: {
          Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
        },
      },
    );
    return response.data;
  }

  async delete(dto: DeleteAppBundleDto): Promise<void> {
    await this.httpClient.delete(`/v1/apps/${dto.appId}/bundles/${dto.appBundleId}`, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
  }
}

const appBundlesService: AppBundlesService = new AppBundlesServiceImpl(httpClient);

export default appBundlesService;
