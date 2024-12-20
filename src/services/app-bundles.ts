import FormData from 'form-data';
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
    const formData = new FormData();
    formData.append('artifactType', dto.artifactType);
    if (dto.channelName) {
      formData.append('channelName', dto.channelName);
    }
    if (dto.expiresAt) {
      formData.append('expiresAt', dto.expiresAt);
    }
    if (dto.url) {
      formData.append('url', dto.url);
    }
    if (dto.maxAndroidAppVersionCode) {
      formData.append('maxAndroidAppVersionCode', dto.maxAndroidAppVersionCode);
    }
    if (dto.maxIosAppVersionCode) {
      formData.append('maxIosAppVersionCode', dto.maxIosAppVersionCode);
    }
    if (dto.minAndroidAppVersionCode) {
      formData.append('minAndroidAppVersionCode', dto.minAndroidAppVersionCode);
    }
    if (dto.minIosAppVersionCode) {
      formData.append('minIosAppVersionCode', dto.minIosAppVersionCode);
    }
    if (dto.rolloutPercentage) {
      formData.append('rolloutPercentage', dto.rolloutPercentage.toString());
    }
    const response = await this.httpClient.post<AppBundleDto>(`/apps/${dto.appId}/bundles`, formData, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
        ...formData.getHeaders(),
      },
    });
    return response.data;
  }

  async update(dto: UpdateAppBundleDto): Promise<AppBundleDto> {
    const response = await this.httpClient.patch<AppBundleDto>(`/apps/${dto.appId}/bundles/${dto.appBundleId}`, dto, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
    return response.data;
  }

  async delete(dto: DeleteAppBundleDto): Promise<void> {
    await this.httpClient.delete(`/apps/${dto.appId}/bundles/${dto.appBundleId}`, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
  }
}

const appBundlesService: AppBundlesService = new AppBundlesServiceImpl(httpClient);

export default appBundlesService;
