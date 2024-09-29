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

  async create(data: CreateAppBundleDto): Promise<AppBundleDto> {
    const response = await this.httpClient.post<AppBundleDto>(`/apps/${data.appId}/bundles`, data.formData, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
        ...data.formData.getHeaders(),
      },
    });
    if (!response.success) {
      throw response.error;
    }
    return response.data;
  }

  async update(data: UpdateAppBundleDto): Promise<AppBundleDto> {
    const response = await this.httpClient.patch<AppBundleDto>(
      `/apps/${data.appId}/bundles/${data.appBundleId}`,
      data,
      {
        headers: {
          Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
        },
      },
    );
    if (!response.success) {
      throw response.error;
    }
    return response.data;
  }

  async delete(data: DeleteAppBundleDto): Promise<void> {
    const response = await this.httpClient.delete(`/apps/${data.appId}/bundles/${data.appBundleId}`, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
    if (!response.success) {
      throw response.error;
    }
  }
}

const appBundlesService: AppBundlesService = new AppBundlesServiceImpl(httpClient);

export default appBundlesService;
