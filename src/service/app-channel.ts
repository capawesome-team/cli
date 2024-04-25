import { CreateAppChannelDto, DeleteAppChannelDto } from "../types";
import httpClient, { HttpClient } from "../utils/http-client";
import authorizationService from "./authorization-service";

export interface AppChannelsService {
  create(dto: CreateAppChannelDto): Promise<void>;
  delete(dto: DeleteAppChannelDto): Promise<void>;
}

class AppChannelsServiceImpl implements AppChannelsService {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async create(dto: CreateAppChannelDto): Promise<void> {
    const res = await this.httpClient.post(`/apps/${dto.appId}/channels`, dto, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
    if (!res.success) {
      throw res.error;
    }
  }

  async delete(data: DeleteAppChannelDto): Promise<void> {
    const res = await this.httpClient.delete(`/apps/${data.appId}/channels`, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
      params: {
        name: data.name,
      },
    });
    if (!res.success) {
      throw res.error;
    }
  }
}

const appChannelsService: AppChannelsService = new AppChannelsServiceImpl(
  httpClient,
);

export default appChannelsService;
