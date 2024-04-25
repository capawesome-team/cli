import { CreateAppBundleDto, DeleteAppBundleDto } from "../types";
import httpClient, { HttpClient } from "../utils/http-client";
import authorizationService from "./authorization-service";

export interface AppBundlesService {
  create(dto: CreateAppBundleDto): Promise<void>;
  delete(dto: DeleteAppBundleDto): Promise<void>;
}

class AppBundlesServiceImpl implements AppBundlesService {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async create(data: CreateAppBundleDto): Promise<void> {
    const res = await this.httpClient.post(
      `/apps/${data.appId}/bundles`,
      data.formData,
      {
        headers: {
          Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
          ...data.formData.getHeaders(),
        },
      },
    );
    if (!res.success) {
      throw res.error;
    }
  }

  async delete(data: DeleteAppBundleDto): Promise<void> {
    const res = await this.httpClient.delete(
      `/apps/${data.appId}/bundles/${data.bundleId}`,
      {
        headers: {
          Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
        },
      },
    );
    if (!res.success) {
      throw res.error;
    }
  }
}

const appBundlesService: AppBundlesService = new AppBundlesServiceImpl(
  httpClient,
);

export default appBundlesService;
