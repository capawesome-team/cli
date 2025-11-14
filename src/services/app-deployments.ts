import authorizationService from '@/services/authorization-service.js';
import { AppDeploymentDto, CreateAppDeploymentDto } from '@/types/app-deployment.js';
import httpClient, { HttpClient } from '@/utils/http-client.js';

export interface AppDeploymentsService {
  create(dto: CreateAppDeploymentDto): Promise<AppDeploymentDto>;
}

class AppDeploymentsServiceImpl implements AppDeploymentsService {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async create(dto: CreateAppDeploymentDto): Promise<AppDeploymentDto> {
    const { appId, appBuildId, appDestinationName } = dto;
    const bodyData: { appBuildId: string; appDestinationName?: string } = {
      appBuildId,
    };
    if (appDestinationName) {
      bodyData.appDestinationName = appDestinationName;
    }
    const response = await this.httpClient.post<AppDeploymentDto>(`/v1/apps/${appId}/deployments`, bodyData, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
    return response.data;
  }
}

const appDeploymentsService = new AppDeploymentsServiceImpl(httpClient);

export default appDeploymentsService;
