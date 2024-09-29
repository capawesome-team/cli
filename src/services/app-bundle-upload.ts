export interface UploadFileOptions {
  appBundleId: string;
  appId: string;
  path: string;
}

export interface AppBundleUploadService {
  upload(data: UploadFileOptions): Promise<void>;
}

class AppBundleUploadServiceImpl implements AppBundleUploadService {
  async upload(data: UploadFileOptions): Promise<void> {}
}

const appBundleUploadService: AppBundleUploadService = new AppBundleUploadServiceImpl();

export default appBundleUploadService;
