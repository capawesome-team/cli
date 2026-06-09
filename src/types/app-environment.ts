export interface AppEnvironmentVariableDto {
  id: string;
  key: string;
  value: string;
}

export interface AppEnvironmentSecretDto {
  id: string;
  key: string;
}

export interface AppEnvironmentDto {
  id: string;
  appId: string;
  name: string;
  appEnvironmentVariables?: AppEnvironmentVariableDto[];
  appEnvironmentSecrets?: AppEnvironmentSecretDto[];
}

export interface FindAllAppEnvironmentsDto {
  appId: string;
  name?: string;
  relations?: string;
  limit?: number;
  offset?: number;
}

export interface FindOneAppEnvironmentByIdDto {
  appId: string;
  id: string;
  relations?: string;
}

export interface CreateAppEnvironmentDto {
  appId: string;
  name: string;
}

export interface DeleteAppEnvironmentDto {
  appId: string;
  id?: string;
  name?: string;
}

export interface EnvironmentVariable {
  key: string;
  value: string;
}

export interface SetEnvironmentVariablesDto {
  appId: string;
  environmentId: string;
  variables: EnvironmentVariable[];
}

export interface SetEnvironmentSecretsDto {
  appId: string;
  environmentId: string;
  secrets: EnvironmentVariable[];
}

export interface UnsetEnvironmentVariablesDto {
  appId: string;
  environmentId: string;
  keys: string[];
}

export interface UnsetEnvironmentSecretsDto {
  appId: string;
  environmentId: string;
  keys: string[];
}
