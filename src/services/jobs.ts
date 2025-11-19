import authorizationService from '@/services/authorization-service.js';
import { JobDto, UpdateJobDto } from '@/types/job.js';
import httpClient, { HttpClient } from '@/utils/http-client.js';

export interface JobsService {
  update(options: { jobId: string; dto: UpdateJobDto }): Promise<JobDto>;
}

class JobsServiceImpl implements JobsService {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async update(options: { jobId: string; dto: UpdateJobDto }): Promise<JobDto> {
    const { jobId, dto } = options;
    const response = await this.httpClient.patch<JobDto>(`/v1/jobs/${jobId}`, dto, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
    });
    return response.data;
  }
}

const jobsService = new JobsServiceImpl(httpClient);

export default jobsService;
