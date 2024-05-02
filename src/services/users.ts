import { UserDto } from '../types';
import httpClient, { HttpClient } from '../utils/http-client';
import authorizationService from './authorization-service';

export interface UsersService {
  me(): Promise<UserDto>;
}

class UsersServiceImpl implements UsersService {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async me(): Promise<UserDto> {
    const response = await this.httpClient.get<UserDto>('/users/me', {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
    if (!response.success) {
      throw response.error;
    }
    return response.data;
  }
}

const usersService = new UsersServiceImpl(httpClient);

export default usersService;
