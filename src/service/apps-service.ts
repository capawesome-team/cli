import { AppModel } from '../types/app'
import httpClient, { HttpClient } from '../utils/http-client'
import authorizationService from './authorization-service'
import { CreateBundleDto } from '../types/bundle'

export interface AppsService {
  getAll(): Promise<AppModel[]>

  create(data: CreateBundleDto): Promise<void>
}

export class AppsServiceImpl implements AppsService {
  private readonly httpClient: HttpClient

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient
  }

  async getAll(): Promise<AppModel[]> {
    const res = await this.httpClient.get<AppModel[]>('/apps', { Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}` })
    if (!res.success) {
      throw res.error
    }
    return res.data
  }

  async create(data: CreateBundleDto): Promise<void> {
    const res = await httpClient.post(`/apps/${data.appId}/bundles`, data.formData, {
      Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
      ...data.formData.getHeaders(),
    })
    if (!res.success) {
      throw res.error
    }
  }
}

const appsService: AppsService = new AppsServiceImpl(httpClient)

export default appsService
