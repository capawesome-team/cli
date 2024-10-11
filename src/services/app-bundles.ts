import { AppBundleDto, CreateAppBundleDto, DeleteAppBundleDto, UpadteAppBundleDto } from '../types';
import httpClient, { HttpClient } from '../utils/http-client';
import authorizationService from './authorization-service';

export interface AppBundlesService {
  create(dto: CreateAppBundleDto): Promise<AppBundleDto>;
  delete(dto: DeleteAppBundleDto): Promise<void>;
  update(dto: UpadteAppBundleDto): Promise<AppBundleDto>;
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
    return response.data;
  }

  async update(data: UpadteAppBundleDto): Promise<AppBundleDto> {
    const response = await this.httpClient.patch<AppBundleDto>(`/apps/${data.appId}/bundles/${data.bundleId}`, data, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
    return response.data;
  }

  async delete(data: DeleteAppBundleDto): Promise<void> {
    await this.httpClient.delete(`/apps/${data.appId}/bundles/${data.bundleId}`, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
  }
}

const appBundlesService: AppBundlesService = new AppBundlesServiceImpl(httpClient);

export default appBundlesService;
