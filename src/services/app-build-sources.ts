import { MAX_CONCURRENT_PART_UPLOADS } from '@/config/index.js';
import authorizationService from '@/services/authorization-service.js';
import { AppBuildSourceDto, CreateAppBuildSourceDto } from '@/types/app-build-source.js';
import httpClient, { HttpClient } from '@/utils/http-client.js';
import FormData from 'form-data';

export interface AppBuildSourcesService {
  create(
    dto: CreateAppBuildSourceDto & { buffer: Buffer; name: string },
    onProgress?: (currentPart: number, totalParts: number) => void,
  ): Promise<AppBuildSourceDto>;
}

class AppBuildSourcesServiceImpl implements AppBuildSourcesService {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async create(
    dto: CreateAppBuildSourceDto & { buffer: Buffer; name: string },
    onProgress?: (currentPart: number, totalParts: number) => void,
  ): Promise<AppBuildSourceDto> {
    const response = await this.httpClient.post<AppBuildSourceDto>(
      `/v1/apps/${dto.appId}/build-sources`,
      { fileSizeInBytes: dto.fileSizeInBytes },
      {
        headers: {
          Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
        },
      },
    );
    await this.upload(
      {
        appBuildSourceId: response.data.id,
        appId: dto.appId,
        buffer: dto.buffer,
        name: dto.name,
      },
      onProgress,
    );
    return response.data;
  }

  private async completeUpload(dto: CompleteAppBuildSourceUploadDto): Promise<void> {
    return this.httpClient
      .post<void>(
        `/v1/apps/${dto.appId}/build-sources/${dto.appBuildSourceId}/upload?action=mpu-complete&uploadId=${dto.uploadId}`,
        {
          parts: dto.parts,
        },
        {
          headers: {
            Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
          },
        },
      )
      .then((response) => response.data);
  }

  private async createUpload(dto: CreateAppBuildSourceUploadDto): Promise<AppBuildSourceUploadDto> {
    const response = await this.httpClient.post<AppBuildSourceUploadDto>(
      `/v1/apps/${dto.appId}/build-sources/${dto.appBuildSourceId}/upload?action=mpu-create`,
      {},
      {
        headers: {
          Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
        },
      },
    );
    return response.data;
  }

  private async createUploadPart(dto: CreateAppBuildSourceUploadPartDto): Promise<AppBuildSourceUploadPartDto> {
    const formData = new FormData();
    formData.append('blob', dto.buffer, { filename: dto.name });
    formData.append('partNumber', dto.partNumber.toString());

    return this.httpClient
      .put<AppBuildSourceUploadPartDto>(
        `/v1/apps/${dto.appId}/build-sources/${dto.appBuildSourceId}/upload?action=mpu-uploadpart&uploadId=${dto.uploadId}`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
            ...formData.getHeaders(),
          },
        },
      )
      .then((response) => response.data);
  }

  private async createUploadParts(
    dto: CreateAppBuildSourceUploadPartsDto,
    onProgress?: (currentPart: number, totalParts: number) => void,
  ): Promise<AppBuildSourceUploadPartDto[]> {
    const uploadedParts: AppBuildSourceUploadPartDto[] = [];
    const partSize = 10 * 1024 * 1024; // 10 MB
    const totalParts = Math.ceil(dto.buffer.byteLength / partSize);
    let partNumber = 0;
    const uploadNextPart = async () => {
      if (partNumber >= totalParts) {
        return;
      }
      partNumber++;
      onProgress?.(partNumber, totalParts);
      const start = (partNumber - 1) * partSize;
      const end = Math.min(start + partSize, dto.buffer.byteLength);
      const partBuffer = dto.buffer.subarray(start, end);

      const uploadedPart = await this.createUploadPart({
        appBuildSourceId: dto.appBuildSourceId,
        appId: dto.appId,
        buffer: partBuffer,
        name: dto.name,
        partNumber,
        uploadId: dto.uploadId,
      });
      uploadedParts.push(uploadedPart);
      await uploadNextPart();
    };

    const uploadPartPromises = Array.from({ length: MAX_CONCURRENT_PART_UPLOADS });
    for (let i = 0; i < MAX_CONCURRENT_PART_UPLOADS; i++) {
      uploadPartPromises[i] = uploadNextPart();
    }
    await Promise.all(uploadPartPromises);
    return uploadedParts.sort((a, b) => a.partNumber - b.partNumber);
  }

  private async upload(
    dto: UploadAppBuildSourceDto,
    onProgress?: (currentPart: number, totalParts: number) => void,
  ): Promise<void> {
    // 1. Create a multipart upload
    const { uploadId } = await this.createUpload({
      appBuildSourceId: dto.appBuildSourceId,
      appId: dto.appId,
    });
    // 2. Upload the file in parts
    const parts = await this.createUploadParts(
      {
        appBuildSourceId: dto.appBuildSourceId,
        appId: dto.appId,
        buffer: dto.buffer,
        name: dto.name,
        uploadId,
      },
      onProgress,
    );
    // 3. Complete the upload
    await this.completeUpload({
      appBuildSourceId: dto.appBuildSourceId,
      appId: dto.appId,
      parts,
      uploadId,
    });
  }
}

const appBuildSourcesService: AppBuildSourcesService = new AppBuildSourcesServiceImpl(httpClient);

export default appBuildSourcesService;

interface AppBuildSourceUploadDto {
  uploadId: string;
}

interface AppBuildSourceUploadPartDto {
  etag: string;
  partNumber: number;
}

interface CompleteAppBuildSourceUploadDto {
  appId: string;
  appBuildSourceId: string;
  parts: AppBuildSourceUploadPartDto[];
  uploadId: string;
}

interface CreateAppBuildSourceUploadDto {
  appId: string;
  appBuildSourceId: string;
}

interface CreateAppBuildSourceUploadPartDto {
  appId: string;
  appBuildSourceId: string;
  buffer: Buffer;
  name: string;
  partNumber: number;
  uploadId: string;
}

interface CreateAppBuildSourceUploadPartsDto {
  appId: string;
  appBuildSourceId: string;
  buffer: Buffer;
  name: string;
  uploadId: string;
}

interface UploadAppBuildSourceDto {
  appBuildSourceId: string;
  appId: string;
  buffer: Buffer;
  name: string;
}
