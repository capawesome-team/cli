import { UserDto } from '@/types/index.js';
import httpClient, { HttpClient } from '@/utils/http-client.js';
import authorizationService from '@/services/authorization-service.js';

export interface UsersService {
  me(): Promise<UserDto>;
}

class UsersServiceImpl implements UsersService {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async me(): Promise<UserDto> {
    const response = await this.httpClient.get<UserDto>('/v1/users/me', {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
    return response.data;
  }
}

const usersService = new UsersServiceImpl(httpClient);

export default usersService;
