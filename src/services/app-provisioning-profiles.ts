import authorizationService from '@/services/authorization-service.js';
import {
  AppProvisioningProfileDto,
  CreateAppProvisioningProfileDto,
  UpdateAppProvisioningProfilesDto,
} from '@/types/app-provisioning-profile.js';
import httpClient, { HttpClient } from '@/utils/http-client.js';
import FormData from 'form-data';

export interface AppProvisioningProfilesService {
  create(dto: CreateAppProvisioningProfileDto): Promise<AppProvisioningProfileDto>;
  updateMany(dto: UpdateAppProvisioningProfilesDto): Promise<void>;
}

class AppProvisioningProfilesServiceImpl implements AppProvisioningProfilesService {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async create(dto: CreateAppProvisioningProfileDto): Promise<AppProvisioningProfileDto> {
    const formData = new FormData();
    formData.append('file', dto.buffer, { filename: dto.fileName });
    if (dto.certificateId) {
      formData.append('certificateId', dto.certificateId);
    }
    const response = await this.httpClient.post<AppProvisioningProfileDto>(
      `/v1/apps/${dto.appId}/provisioning-profiles`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
          ...formData.getHeaders(),
        },
      },
    );
    return response.data;
  }

  async updateMany(dto: UpdateAppProvisioningProfilesDto): Promise<void> {
    const ids = dto.ids.join(',');
    await this.httpClient.patch(
      `/v1/apps/${dto.appId}/provisioning-profiles?ids=${ids}`,
      { appCertificateId: dto.appCertificateId },
      {
        headers: {
          Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
        },
      },
    );
  }
}

const appProvisioningProfilesService = new AppProvisioningProfilesServiceImpl(httpClient);

export default appProvisioningProfilesService;
