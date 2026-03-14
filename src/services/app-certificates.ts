import authorizationService from '@/services/authorization-service.js';
import {
  AppCertificateDto,
  CreateAppCertificateDto,
  DeleteAppCertificateDto,
  FindAllAppCertificatesDto,
  FindOneAppCertificateDto,
  UpdateAppCertificateDto,
} from '@/types/app-certificate.js';
import httpClient, { HttpClient } from '@/utils/http-client.js';
import FormData from 'form-data';

export interface AppCertificatesService {
  create(dto: CreateAppCertificateDto): Promise<AppCertificateDto>;
  delete(dto: DeleteAppCertificateDto): Promise<void>;
  findAll(dto: FindAllAppCertificatesDto): Promise<AppCertificateDto[]>;
  findOneById(dto: FindOneAppCertificateDto): Promise<AppCertificateDto>;
  update(dto: UpdateAppCertificateDto): Promise<AppCertificateDto>;
}

class AppCertificatesServiceImpl implements AppCertificatesService {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async create(dto: CreateAppCertificateDto): Promise<AppCertificateDto> {
    const formData = new FormData();
    formData.append('file', dto.buffer, { filename: dto.fileName });
    formData.append('name', dto.name);
    formData.append('platform', dto.platform);
    formData.append('type', dto.type);
    if (dto.password) {
      formData.append('password', dto.password);
    }
    if (dto.keyAlias) {
      formData.append('keyAlias', dto.keyAlias);
    }
    if (dto.keyPassword) {
      formData.append('keyPassword', dto.keyPassword);
    }
    const response = await this.httpClient.post<AppCertificateDto>(`/v1/apps/${dto.appId}/certificates`, formData, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
        ...formData.getHeaders(),
      },
    });
    return response.data;
  }

  async delete(dto: DeleteAppCertificateDto): Promise<void> {
    await this.httpClient.delete(`/v1/apps/${dto.appId}/certificates/${dto.certificateId}`, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
  }

  async findAll(dto: FindAllAppCertificatesDto): Promise<AppCertificateDto[]> {
    const params: Record<string, string> = {};
    if (dto.limit) {
      params.limit = dto.limit.toString();
    }
    if (dto.offset) {
      params.offset = dto.offset.toString();
    }
    if (dto.platform) {
      params.platform = dto.platform;
    }
    if (dto.type) {
      params.type = dto.type;
    }
    if (dto.query) {
      params.query = dto.query;
    }
    const response = await this.httpClient.get<AppCertificateDto[]>(`/v1/apps/${dto.appId}/certificates`, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
      params,
    });
    return response.data;
  }

  async findOneById(dto: FindOneAppCertificateDto): Promise<AppCertificateDto> {
    const response = await this.httpClient.get<AppCertificateDto>(
      `/v1/apps/${dto.appId}/certificates/${dto.certificateId}`,
      {
        headers: {
          Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
        },
      },
    );
    return response.data;
  }

  async update(dto: UpdateAppCertificateDto): Promise<AppCertificateDto> {
    const response = await this.httpClient.patch<AppCertificateDto>(
      `/v1/apps/${dto.appId}/certificates/${dto.certificateId}`,
      dto,
      {
        headers: {
          Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
        },
      },
    );
    return response.data;
  }
}

const appCertificatesService = new AppCertificatesServiceImpl(httpClient);

export default appCertificatesService;
