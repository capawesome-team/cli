import { OrganizationDto } from '../types/organization';
import httpClient, { HttpClient } from '../utils/http-client';
import authorizationService from './authorization-service';

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
