export interface CreateSessionDto {
  code: string;
  provider: 'code';
}

export interface DeleteSessionDto {
  id: string;
}

export interface SessionDto {
  id: string;
}
