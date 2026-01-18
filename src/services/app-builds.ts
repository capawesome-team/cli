import authorizationService from '@/services/authorization-service.js';
import { AppBuildDto, CreateAppBuildDto, FindAllAppBuildsDto, FindOneAppBuildDto } from '@/types/app-build.js';
import httpClient, { HttpClient } from '@/utils/http-client.js';

export interface DownloadArtifactDto {
  appId: string;
  appBuildId: string;
  artifactId: string;
}

export interface AppBuildsService {
  create(dto: CreateAppBuildDto): Promise<AppBuildDto>;
  findAll(dto: FindAllAppBuildsDto): Promise<AppBuildDto[]>;
  findOne(dto: FindOneAppBuildDto): Promise<AppBuildDto>;
  downloadArtifact(dto: DownloadArtifactDto): Promise<ArrayBuffer>;
}

class AppBuildsServiceImpl implements AppBuildsService {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async create(dto: CreateAppBuildDto): Promise<AppBuildDto> {
    const { appId, ...bodyData } = dto;
    const response = await this.httpClient.post<AppBuildDto>(`/v1/apps/${appId}/builds`, bodyData, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
    return response.data;
  }

  async findAll(dto: FindAllAppBuildsDto): Promise<AppBuildDto[]> {
    const params: Record<string, string> = {};
    if (dto.platform) {
      params.platform = dto.platform;
    }
    const response = await this.httpClient.get<AppBuildDto[]>(`/v1/apps/${dto.appId}/builds`, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
      params,
    });
    return response.data;
  }

  async findOne(dto: FindOneAppBuildDto): Promise<AppBuildDto> {
    const { appId, appBuildId, relations } = dto;
    const params: Record<string, string> = {};
    if (relations) {
      params.relations = relations;
    }
    const response = await this.httpClient.get<AppBuildDto>(`/v1/apps/${appId}/builds/${appBuildId}`, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
      params,
    });
    return response.data;
  }

  async downloadArtifact(dto: DownloadArtifactDto): Promise<ArrayBuffer> {
    const { appId, appBuildId, artifactId } = dto;
    const response = await this.httpClient.get<ArrayBuffer>(
      `/v1/apps/${appId}/builds/${appBuildId}/artifacts/${artifactId}/download`,
      {
        headers: {
          Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
        },
        responseType: 'arraybuffer',
      },
    );
    return response.data;
  }
}

const appBuildsService = new AppBuildsServiceImpl(httpClient);

export default appBuildsService;
