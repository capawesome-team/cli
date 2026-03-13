import { DeleteAppDeviceDto, UpdateAppDeviceDto } from '@/types/index.js';
import httpClient, { HttpClient } from '@/utils/http-client.js';
import authorizationService from '@/services/authorization-service.js';

export interface AppDevicesService {
  delete(dto: DeleteAppDeviceDto): Promise<void>;
  update(dto: UpdateAppDeviceDto): Promise<void>;
}

class AppDevicesServiceImpl implements AppDevicesService {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async delete(data: DeleteAppDeviceDto): Promise<void> {
    await this.httpClient.delete(`/v1/apps/${data.appId}/devices/${data.deviceId}`, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
  }

  async update(data: UpdateAppDeviceDto): Promise<void> {
    await this.httpClient.patch(
      `/v1/apps/${data.appId}/devices/${data.deviceId}`,
      { forcedAppChannelId: data.forcedAppChannelId },
      {
        headers: {
          Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
        },
      },
    );
  }
}

const appDevicesService: AppDevicesService = new AppDevicesServiceImpl(httpClient);

export default appDevicesService;
