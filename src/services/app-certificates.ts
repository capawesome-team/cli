import authorizationService from '@/services/authorization-service.js';
import { AppCertificateDto, FindAllAppCertificatesDto } from '@/types/app-certificate.js';
import httpClient, { HttpClient } from '@/utils/http-client.js';

export interface AppCertificatesService {
  findAll(dto: FindAllAppCertificatesDto): Promise<AppCertificateDto[]>;
}

class AppCertificatesServiceImpl implements AppCertificatesService {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async findAll(dto: FindAllAppCertificatesDto): Promise<AppCertificateDto[]> {
    const { appId } = dto;
    const response = await this.httpClient.get<AppCertificateDto[]>(`/v1/apps/${appId}/certificates`, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
    return response.data;
  }
}

const appCertificatesService = new AppCertificatesServiceImpl(httpClient);

export default appCertificatesService;
