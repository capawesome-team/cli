import {
  AppDeviceDto,
  DeleteAppDeviceDto,
  FindOneAppDeviceDto,
  ProbeAppDeviceDto,
  ProbeAppDeviceResponseDto,
  UpdateAppDeviceDto,
} from '@/types/index.js';
import httpClient, { HttpClient } from '@/utils/http-client.js';
import authorizationService from '@/services/authorization-service.js';

export interface AppDevicesService {
  delete(dto: DeleteAppDeviceDto): Promise<void>;
  findOneById(dto: FindOneAppDeviceDto): Promise<AppDeviceDto>;
  probe(dto: ProbeAppDeviceDto): Promise<ProbeAppDeviceResponseDto>;
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

  async findOneById(data: FindOneAppDeviceDto): Promise<AppDeviceDto> {
    const response = await this.httpClient.get<AppDeviceDto>(`/v1/apps/${data.appId}/devices/${data.deviceId}`, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
      params: {
        relations: 'appChannel',
      },
    });
    return response.data;
  }

  async probe(data: ProbeAppDeviceDto): Promise<ProbeAppDeviceResponseDto> {
    const params: Record<string, string> = {
      appVersionCode: data.appVersionCode,
      appVersionName: data.appVersionName,
      osVersion: data.osVersion,
      platform: data.platform.toString(),
      pluginVersion: data.pluginVersion,
    };
    if (data.channelName) {
      params.channelName = data.channelName;
    }
    if (data.customId) {
      params.customId = data.customId;
    }
    if (data.deviceId) {
      params.deviceId = data.deviceId;
    }
    const response = await this.httpClient.get<ProbeAppDeviceResponseDto>(`/v1/apps/${data.appId}/bundles/latest`, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
      params,
    });
    return response.data;
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
