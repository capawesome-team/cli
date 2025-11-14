export interface JobLogDto {
  jobId: string;
  number: number;
  payload: string;
  timestamp: number;
}

export interface JobDto {
  id: string;
  status: string;
  statusMessage?: string;
  appBuildId?: string;
  appDeploymentId?: string;
  appId?: string;
  organizationId?: string;
  queuedAt?: number;
  pendingAt?: number;
  inProgressAt?: number;
  finishedAt?: number;
  canceledAt?: number;
  canceledBy?: string;
  queueTimeInSeconds?: number;
  pendingTimeInSeconds?: number;
  inProgressTimeInSeconds?: number;
  totalTimeInSeconds?: number;
  createdAt?: number;
  createdBy?: string;
  jobLogs?: JobLogDto[];
}

export interface UpdateJobDto {
  status: string;
}
