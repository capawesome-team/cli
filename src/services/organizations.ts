import { OrganizationDto } from '@/types/organization.js';
import httpClient, { HttpClient } from '@/utils/http-client.js';
import authorizationService from '@/services/authorization-service.js';

export interface OrganizationsService {
  findAll(): Promise<OrganizationDto[]>;
}

class OrganizationsServiceImpl implements OrganizationsService {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async findAll(): Promise<OrganizationDto[]> {
    const response = await this.httpClient.get<OrganizationDto[]>(`/v1/organizations`, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
    return response.data;
  }
}

const organizationsService = new OrganizationsServiceImpl(httpClient);

export default organizationsService;
