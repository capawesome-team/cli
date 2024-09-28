export interface UserDto {
  id: string;
  email: string | null;
  userProviderProfiles: UserProviderProfileDto[];
}

export interface UserProviderProfileDto {
  id: string;
  provider: 'gitlab' | 'github';
  providerUsername: string;
}
