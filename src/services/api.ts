import authorizationService from '@/services/authorization-service.js';
import httpClient, { HttpClient } from '@/utils/http-client.js';
import { AxiosResponse, Method } from 'axios';

export interface ApiRequestDto {
  body?: unknown;
  method: Method;
  path: string;
}

export interface ApiService {
  request(dto: ApiRequestDto): Promise<AxiosResponse<Buffer>>;
}

class ApiServiceImpl implements ApiService {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async request(dto: ApiRequestDto): Promise<AxiosResponse<Buffer>> {
    const { body, method, path } = dto;
    const hasBody = body !== undefined;
    return this.httpClient.request<Buffer>({
      data: hasBody ? JSON.stringify(body) : undefined,
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      },
      method,
      responseType: 'arraybuffer',
      url: path,
    });
  }
}

const apiService = new ApiServiceImpl(httpClient);

export default apiService;
