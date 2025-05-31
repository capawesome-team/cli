import FormData from 'form-data';
import { MAX_CONCURRENT_UPLOADS } from '../config';
import { AppBundleFileDto, CreateAppBundleFileDto, UploadAppBundleFileDto } from '../types/app-bundle-file';
import httpClient, { HttpClient } from '../utils/http-client';
import authorizationService from './authorization-service';

export interface AppBundleFilesService {
  create(dto: CreateAppBundleFileDto): Promise<AppBundleFileDto>;
  upload(dto: UploadAppBundleFileDto): Promise<AppBundleFileDto>;
}

interface AppBundleFileUploadDto {
  uploadId: string;
  key: string;
}

interface AppBundleFileUploadPartDto {
  partNumber: number;
  etag: string;
}

interface CompleteAppBundleFileUploadDto extends UploadAppBundleFileDto {
  key: string;
  parts: AppBundleFileUploadPartDto[];
  uploadId: string;
}

interface CreateAppBundleFileUploadPartDto {
  appBundleId: string;
  appId: string;
  buffer: Buffer;
  key: string;
  name: string;
  partNumber: number;
  uploadId: string;
}

interface CreateAppBundleFileUploadPartsDto extends UploadAppBundleFileDto {
  key: string;
  uploadId: string;
}

interface CreateAppBundleFileUploadDto {
  appBundleId: string;
  appId: string;
}

class AppBundleFilesServiceImpl implements AppBundleFilesService {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async create(dto: CreateAppBundleFileDto): Promise<AppBundleFileDto> {
    const formData = new FormData();
    formData.append('checksum', dto.checksum);
    formData.append('file', dto.buffer, { filename: dto.name });
    if (dto.href) {
      formData.append('href', dto.href);
    }
    if (dto.signature) {
      formData.append('signature', dto.signature);
    }
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
    return response.data;
  }

  async upload(dto: UploadAppBundleFileDto): Promise<AppBundleFileDto> {
    // 1. Create a multipart upload
    const { key, uploadId } = await this.createUpload(dto);
    // 2. Upload the file in parts
    const parts = await this.createUploadParts({
      ...dto,
      key,
      uploadId,
    });
    // 3. Complete the upload
    return this.completeUpload({ ...dto, key, parts, uploadId });
  }

  private async completeUpload(dto: CompleteAppBundleFileUploadDto): Promise<AppBundleFileDto> {
    return this.httpClient
      .post<AppBundleFileDto>(
        `/v1/apps/${dto.appId}/bundles/${dto.appBundleId}/files/upload/${dto.uploadId}/complete`,
        {
          checksum: dto.checksum,
          href: dto.href,
          key: dto.key,
          mimeType: dto.mimeType,
          name: dto.name,
          parts: dto.parts,
          signature: dto.signature,
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
      `/v1/apps/${dto.appId}/bundles/${dto.appBundleId}/files/upload`,
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
    formData.append('key', dto.key);
    formData.append('partNumber', dto.partNumber.toString());

    return this.httpClient
      .post<AppBundleFileUploadPartDto>(
        `/v1/apps/${dto.appId}/bundles/${dto.appBundleId}/files/upload/${dto.uploadId}/parts`,
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
    const totalParts = Math.ceil(dto.buffer.length / partSize);
    let partNumber = 0;
    const uploadNextPart = async () => {
      if (partNumber >= totalParts) {
        return;
      }
      partNumber++;
      const start = (partNumber - 1) * partSize;
      const end = Math.min(start + partSize, dto.buffer.length);
      const partBuffer = dto.buffer.subarray(start, end);

      const uploadedPart = await this.createUploadPart({
        appBundleId: dto.appBundleId,
        appId: dto.appId,
        buffer: partBuffer,
        key: dto.key,
        name: dto.name,
        partNumber,
        uploadId: dto.uploadId,
      });
      uploadedParts.push(uploadedPart);
      await uploadNextPart();
    };

    const uploadPartPromises = Array(MAX_CONCURRENT_UPLOADS);
    for (let i = 0; i < MAX_CONCURRENT_UPLOADS; i++) {
      uploadPartPromises[i] = uploadNextPart();
    }
    await Promise.all(uploadPartPromises);
    return uploadedParts;
  }
}

const appBundleFilesService: AppBundleFilesService = new AppBundleFilesServiceImpl(httpClient);

export default appBundleFilesService;
