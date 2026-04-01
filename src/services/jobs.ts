import authorizationService from '@/services/authorization-service.js';
import { FindOneJobDto, JobDto, UpdateJobDto } from '@/types/job.js';
import httpClient, { HttpClient } from '@/utils/http-client.js';

export interface JobsService {
  findOne(dto: FindOneJobDto): Promise<JobDto>;
  update(options: { jobId: string; dto: UpdateJobDto }): Promise<JobDto>;
}

class JobsServiceImpl implements JobsService {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async findOne(dto: FindOneJobDto): Promise<JobDto> {
    const params: Record<string, string> = {};
    if (dto.relations) {
      params.relations = dto.relations;
    }
    const response = await this.httpClient.get<JobDto>(`/v1/jobs/${dto.jobId}`, {
      headers: {
        Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      },
      params,
    });
    return response.data;
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
