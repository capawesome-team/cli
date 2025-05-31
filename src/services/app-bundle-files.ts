import FormData from 'form-data';
import { AppBundleFileDto, CreateAppBundleFileDto, UploadAppBundleFileDto } from '../types/app-bundle-file';
import httpClient, { HttpClient } from '../utils/http-client';
import authorizationService from './authorization-service';

export interface AppBundleFilesService {
  create(dto: CreateAppBundleFileDto): Promise<AppBundleFileDto>;
  upload(dto: UploadAppBundleFileDto): Promise<AppBundleFileDto>;
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
    const { key, uploadId } = await this.httpClient
      .post<{ key: string; uploadId: string }>(
        `/v1/apps/${dto.appId}/bundles/${dto.appBundleId}/files/upload`,
        {},
        {
          headers: {
            Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
          },
        },
      )
      .then((response) => response.data);
    // 2. Upload the file in parts
    const uploadPartPromises: Promise<{
      partNumber: number;
      etag: string;
    }>[] = [];
    const partSize = 10 * 1024 * 1024; // 10 MB. 5 MB is the minimum part size except for the last part.
    const totalParts = Math.ceil(dto.fileBuffer.length / partSize);
    for (let partNumber = 1; partNumber <= totalParts; partNumber++) {
      const start = (partNumber - 1) * partSize;
      const end = Math.min(start + partSize, dto.fileBuffer.length);
      const partBuffer = dto.fileBuffer.subarray(start, end);
      const formData = new FormData();
      formData.append('blob', partBuffer, { filename: dto.fileName });
      formData.append('key', key);
      formData.append('partNumber', partNumber.toString());
      uploadPartPromises.push(
        this.httpClient
          .post<{
            partNumber: number;
            etag: string;
          }>(`/v1/apps/${dto.appId}/bundles/${dto.appBundleId}/files/upload/${uploadId}/parts`, formData, {
            headers: {
              Authorization: `Bearer ${authorizationService.getCurrentAuthorizationToken()}`,
              ...formData.getHeaders(),
            },
          })
          .then((response) => response.data),
      );
    }
    const uploadedParts = await Promise.all(uploadPartPromises);
    // 3. Complete the upload
    return await this.httpClient
      .post<AppBundleFileDto>(
        `/v1/apps/${dto.appId}/bundles/${dto.appBundleId}/files/upload/${uploadId}/complete`,
        {
          checksum: dto.checksum,
          href: dto.href,
          key,
          mimeType: dto.mimeType,
          name: dto.fileName,
          parts: uploadedParts,
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
}

const appBundleFilesService: AppBundleFilesService = new AppBundleFilesServiceImpl(httpClient);

export default appBundleFilesService;
