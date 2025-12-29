import { MAX_CONCURRENT_UPLOADS } from '@/config/index.js';
import authorizationService from '@/services/authorization-service.js';
import { AppBundleFileDto, CreateAppBundleFileDto } from '@/types/app-bundle-file.js';
import httpClient, { HttpClient } from '@/utils/http-client.js';
import FormData from 'form-data';

export interface AppBundleFilesService {
  create(dto: CreateAppBundleFileDto): Promise<AppBundleFileDto>;
}

class AppBundleFilesServiceImpl implements AppBundleFilesService {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async create(dto: CreateAppBundleFileDto): Promise<AppBundleFileDto> {
    const sizeInBytes = dto.buffer.byteLength;
    const useMultipartUpload = sizeInBytes >= 50 * 1024 * 1024; // 50 MB
    const formData = new FormData();
    formData.append('checksum', dto.checksum);
    if (!useMultipartUpload) {
      formData.append('file', dto.buffer, { filename: dto.name });
    }
    if (dto.href) {
      formData.append('href', dto.href);
    }
    formData.append('mimeType', dto.mimeType);
    formData.append('name', dto.name);
    if (dto.signature) {
      formData.append('signature', dto.signature);
    }
    formData.append('sizeInBytes', sizeInBytes.toString());
    const response = await this.httpClient.post<AppBundleFileDto>(
      `/v1/apps/${dto.appId}/bundles/${dto.appBundleId}/files`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
          ...formData.getHeaders(),
        },
      },
    );
    if (useMultipartUpload) {
      await this.upload({
        appBundleFileId: response.data.id,
        appBundleId: dto.appBundleId,
        appId: dto.appId,
        buffer: dto.buffer,
        name: dto.name,
        checksum: dto.checksum,
      });
    }
    return response.data;
  }

  private async completeUpload(dto: CompleteAppBundleFileUploadDto): Promise<void> {
    return this.httpClient
      .post<void>(
        `/v1/apps/${dto.appId}/bundles/${dto.appBundleId}/files/${dto.appBundleFileId}/upload?action=mpu-complete&uploadId=${dto.uploadId}`,
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

  private async createUpload(dto: CreateAppBundleFileUploadDto): Promise<AppBundleFileUploadDto> {
    const response = await this.httpClient.post<AppBundleFileUploadDto>(
      `/v1/apps/${dto.appId}/bundles/${dto.appBundleId}/files/${dto.appBundleFileId}/upload?action=mpu-create`,
      {},
      {
        headers: {
          Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
        },
      },
    );
    return response.data;
  }

  private async createUploadPart(dto: CreateAppBundleFileUploadPartDto): Promise<AppBundleFileUploadPartDto> {
    const formData = new FormData();
    formData.append('blob', dto.buffer, { filename: dto.name });
    formData.append('partNumber', dto.partNumber.toString());

    return this.httpClient
      .put<AppBundleFileUploadPartDto>(
        `/v1/apps/${dto.appId}/bundles/${dto.appBundleId}/files/${dto.appBundleFileId}/upload?action=mpu-uploadpart&uploadId=${dto.uploadId}`,
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

  private async createUploadParts(dto: CreateAppBundleFileUploadPartsDto): Promise<AppBundleFileUploadPartDto[]> {
    const uploadedParts: AppBundleFileUploadPartDto[] = [];
    const partSize = 10 * 1024 * 1024; // 10 MB. 5 MB is the minimum part size except for the last part.
    const totalParts = Math.ceil(dto.buffer.byteLength / partSize);
    let partNumber = 0;
    const uploadNextPart = async () => {
      if (partNumber >= totalParts) {
        return;
      }
      partNumber++;
      const start = (partNumber - 1) * partSize;
      const end = Math.min(start + partSize, dto.buffer.byteLength);
      const partBuffer = dto.buffer.subarray(start, end);

      const uploadedPart = await this.createUploadPart({
        appBundleFileId: dto.appBundleFileId,
        appBundleId: dto.appBundleId,
        appId: dto.appId,
        buffer: partBuffer,
        name: dto.name,
        partNumber,
        uploadId: dto.uploadId,
      });
      uploadedParts.push(uploadedPart);
      await uploadNextPart();
    };

    const uploadPartPromises = Array.from({ length: MAX_CONCURRENT_UPLOADS });
    for (let i = 0; i < MAX_CONCURRENT_UPLOADS; i++) {
      uploadPartPromises[i] = uploadNextPart();
    }
    await Promise.all(uploadPartPromises);
    return uploadedParts;
  }

  private async upload(dto: UploadAppBundleFileDto): Promise<void> {
    // 1. Create a multipart upload
    const { uploadId } = await this.createUpload({
      appBundleFileId: dto.appBundleFileId,
      appBundleId: dto.appBundleId,
      appId: dto.appId,
    });
    // 2. Upload the file in parts
    const parts = await this.createUploadParts({
      appBundleFileId: dto.appBundleFileId,
      appBundleId: dto.appBundleId,
      appId: dto.appId,
      buffer: dto.buffer,
      name: dto.name,
      uploadId,
    });
    // 3. Complete the upload
    await this.completeUpload({
      appBundleFileId: dto.appBundleFileId,
      appBundleId: dto.appBundleId,
      appId: dto.appId,
      parts,
      uploadId,
    });
  }
}

const appBundleFilesService: AppBundleFilesService = new AppBundleFilesServiceImpl(httpClient);

export default appBundleFilesService;

interface AppBundleFileUploadDto {
  uploadId: string;
}

interface AppBundleFileUploadPartDto {
  etag: string;
  partNumber: number;
}

interface CompleteAppBundleFileUploadDto {
  appId: string;
  appBundleId: string;
  appBundleFileId: string;
  parts: AppBundleFileUploadPartDto[];
  uploadId: string;
}

interface CreateAppBundleFileUploadDto {
  appId: string;
  appBundleId: string;
  appBundleFileId: string;
}

interface CreateAppBundleFileUploadPartDto {
  appId: string;
  appBundleId: string;
  appBundleFileId: string;
  buffer: Buffer;
  name: string;
  partNumber: number;
  uploadId: string;
}

interface CreateAppBundleFileUploadPartsDto {
  appId: string;
  appBundleId: string;
  appBundleFileId: string;
  buffer: Buffer;
  name: string;
  uploadId: string;
}

interface UploadAppBundleFileDto {
  appBundleFileId: string;
  appBundleId: string;
  appId: string;
  buffer: Buffer;
  name: string;
  checksum: string;
  href?: string;
  signature?: string;
}
