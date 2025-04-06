import { DeleteAppDeviceDto } from '../types';
import httpClient, { HttpClient } from '../utils/http-client';
import authorizationService from './authorization-service';

export interface AppDevicesService {
  delete(dto: DeleteAppDeviceDto): Promise<void>;
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
}

const appDevicesService: AppDevicesService = new AppDevicesServiceImpl(httpClient);

export default appDevicesService;
