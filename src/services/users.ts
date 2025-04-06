import { UserDto } from '../types';
import httpClient, { HttpClient } from '../utils/http-client';
import authorizationService from './authorization-service';

export interface UsersService {
  me(bearerToken?: string): Promise<UserDto>;
}

class UsersServiceImpl implements UsersService {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async me(bearerToken?: string): Promise<UserDto> {
    const response = await this.httpClient.get<UserDto>('/v1/users/me', {
      headers: {
        Authorization: `Bearer ${bearerToken || authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
    return response.data;
  }
}

const usersService = new UsersServiceImpl(httpClient);

export default usersService;
