import { SessionCodeDto } from '../types/index.js';
import httpClient, { HttpClient } from '../utils/http-client.js';

export interface SessionCodesService {
  create(): Promise<SessionCodeDto>;
}

class SessionCodesServiceImpl implements SessionCodesService {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async create(): Promise<SessionCodeDto> {
    const response = await this.httpClient.post<SessionCodeDto>(`/v1/sessions/codes`, {});
    return response.data;
  }
}

const sessionCodesService = new SessionCodesServiceImpl(httpClient);

export default sessionCodesService;
