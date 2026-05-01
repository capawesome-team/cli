import {
  CreateOrganizationDto,
  FindAllOrganizationsDto,
  FindOneOrganizationDto,
  OrganizationDto,
} from '@/types/organization.js';
import httpClient, { HttpClient } from '@/utils/http-client.js';
import authorizationService from '@/services/authorization-service.js';

export interface OrganizationsService {
  create(dto: CreateOrganizationDto): Promise<OrganizationDto>;
  findAll(dto?: FindAllOrganizationsDto): Promise<OrganizationDto[]>;
  findOne(dto: FindOneOrganizationDto): Promise<OrganizationDto>;
}

class OrganizationsServiceImpl implements OrganizationsService {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async create(dto: CreateOrganizationDto): Promise<OrganizationDto> {
    const response = await this.httpClient.post<OrganizationDto>('/v1/organizations', dto, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
    return response.data;
  }

  async findAll(dto?: FindAllOrganizationsDto): Promise<OrganizationDto[]> {
    const params: Record<string, string> = {};
    if (dto?.limit !== undefined) {
      params.limit = dto.limit.toString();
    }
    if (dto?.offset !== undefined) {
      params.offset = dto.offset.toString();
    }
    const response = await this.httpClient.get<OrganizationDto[]>(`/v1/organizations`, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
      params,
    });
    return response.data;
  }

  async findOne(dto: FindOneOrganizationDto): Promise<OrganizationDto> {
    const response = await this.httpClient.get<OrganizationDto>(`/v1/organizations/${dto.organizationId}`, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
    return response.data;
  }
}

const organizationsService = new OrganizationsServiceImpl(httpClient);

export default organizationsService;
