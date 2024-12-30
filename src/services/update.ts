import consola from 'consola';
import * as semver from 'semver';
import pkg from '../../package.json';
import { NpmPackageDto } from '../types/npm-package';
import httpClient, { HttpClient } from '../utils/http-client';

export interface UpdateService {
  checkForUpdate(): Promise<void>;
}

class UpdateServiceImpl implements UpdateService {
  private readonly httpClient: HttpClient;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
  }

  async checkForUpdate(): Promise<void> {
    try {
      const response = await this.httpClient.get<NpmPackageDto>(`https://registry.npmjs.org/${pkg.name}/latest`);
      const latestVersion = response.data.version;
      if (semver.gt(latestVersion, pkg.version)) {
        consola.warn(
          `New version of Capawesome CLI available: ${pkg.name}@${latestVersion}. Please update to receive the latest features and bug fixes.`,
        );
      }
    } catch (error) {
      consola.error('Failed to check for updates.');
      process.exit(1);
    }
  }
}

const updateService = new UpdateServiceImpl(httpClient);

export default updateService;
