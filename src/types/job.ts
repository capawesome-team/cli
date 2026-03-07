export interface JobLogDto {
  jobId: string;
  number: number;
  payload: string;
  timestamp: string;
}

export interface JobDto {
  id: string;
  status: string;
  statusMessage?: string;
  appBuildId?: string;
  appDeploymentId?: string;
  appId?: string;
  organizationId?: string;
  finishedAt?: string;
  queueTimeInSeconds?: number;
  pendingTimeInSeconds?: number;
  inProgressTimeInSeconds?: number;
  totalTimeInSeconds?: number;
  jobLogs?: JobLogDto[];
  createdAt: string;
}

export interface UpdateJobDto {
  status: string;
}
