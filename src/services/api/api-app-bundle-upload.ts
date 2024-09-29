import FormData from 'form-data';
import httpClient, { HttpClient } from '../../utils/http-client';
import authorizationService from '../authorization-service';

export interface CompleteMultipartUploadDto {
  appBundleId: string;
  appId: string;
  checksum: string;
  href?: string;
  key: string;
  parts: {
    partNumber: number;
    etag: string;
  }[];
  signature?: string;
  uploadId: string;
}

export interface CreateMultipartUploadDto {
  appBundleId: string;
  appId: string;
}

export interface MultipartUploadDto {
  key: string;
  uploadId: string;
}

export interface PartDto {
  partNumber: number;
  etag: string;
}

export interface UploadPartDto {
  appBundleId: string;
  appId: string;
  formData: FormData;
}

export interface ApiAppBundleUploadService {
  completeMultipartUpload(dto: CompleteMultipartUploadDto): Promise<void>;
  createMultipartUpload(dto: CreateMultipartUploadDto): Promise<MultipartUploadDto>;
  uploadPart(dto: UploadPartDto): Promise<PartDto>;
}

class ApiAppBundleUploadServiceImpl implements ApiAppBundleUploadService {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async completeMultipartUpload(data: CompleteMultipartUploadDto): Promise<void> {
    const response = await this.httpClient.post<void>(
      `/apps/${data.appId}/bundles/${data.appBundleId}/upload`,
      {
        ...data,
        action: 'mpu-complete',
      },
      {
        headers: {
          Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
        },
      },
    );
    if (!response.success) {
      throw response.error;
    }
  }

  async createMultipartUpload(data: CreateMultipartUploadDto): Promise<MultipartUploadDto> {
    const response = await this.httpClient.post<MultipartUploadDto>(
      `/apps/${data.appId}/bundles/${data.appBundleId}/upload`,
      {
        ...data,
        action: 'mpu-create',
      },
      {
        headers: {
          Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
        },
      },
    );
    if (!response.success) {
      throw response.error;
    }
    return response.data;
  }

  async uploadPart(data: UploadPartDto): Promise<PartDto> {
    const response = await this.httpClient.put<PartDto>(
      `/apps/${data.appId}/bundles/${data.appBundleId}/upload`,
      data.formData,
      {
        headers: {
          Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
          ...data.formData.getHeaders(),
        },
      },
    );
    if (!response.success) {
      throw response.error;
    }
    return response.data;
  }
}

const apiAppBundleUploadService: ApiAppBundleUploadService = new ApiAppBundleUploadServiceImpl(httpClient);

export default apiAppBundleUploadService;
