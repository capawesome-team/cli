import { CreateSessionDto, DeleteSessionDto, SessionDto } from '@/types/session.js';
import httpClient, { HttpClient } from '@/utils/http-client.js';
import authorizationService from '@/services/authorization-service.js';

export interface SessionsService {
  create(dto: CreateSessionDto): Promise<SessionDto>;
  delete(dto: DeleteSessionDto): Promise<void>;
}

class SessionsServiceImpl implements SessionsService {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async create(dto: CreateSessionDto): Promise<SessionDto> {
    const response = await this.httpClient.post<SessionDto>(`/v1/sessions`, dto);
    return response.data;
  }

  async delete(dto: DeleteSessionDto): Promise<void> {
    await this.httpClient.delete(`/v1/sessions/${dto.id}`, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
  }
}

const sessionsService = new SessionsServiceImpl(httpClient);

export default sessionsService;
