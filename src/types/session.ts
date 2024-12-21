export interface CreateSessionDto {
  email: string;
  password: string;
}

export interface DeleteSessionDto {
  id: string;
}

export interface SessionDto {
  id: string;
}
