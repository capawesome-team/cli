import FormData from 'form-data';
import { AppBundleFileDto, CreateAppBundleFileDto } from '../types/app-bundle-file';
import httpClient, { HttpClient } from '../utils/http-client';
import authorizationService from './authorization-service';

export interface AppBundleFilesService {
  create(dto: CreateAppBundleFileDto): Promise<AppBundleFileDto>;
}

class AppBundleFilesServiceImpl implements AppBundleFilesService {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async create(dto: CreateAppBundleFileDto): Promise<AppBundleFileDto> {
    const formData = new FormData();
    formData.append('checksum', dto.checksum);
    formData.append('file', dto.fileBuffer, { filename: dto.fileName });
    if (dto.href) {
      formData.append('href', dto.href);
    }
    if (dto.signature) {
      formData.append('signature', dto.signature);
    }
    const response = await this.httpClient.post<AppBundleFileDto>(
      `/apps/${dto.appId}/bundles/${dto.appBundleId}/files`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
          ...formData.getHeaders(),
        },
      },
    );
    if (!response.success) {
      throw response.error;
    }
    return response.data;
  }
}

const appBundleFilesService: AppBundleFilesService = new AppBundleFilesServiceImpl(httpClient);

export default appBundleFilesService;
