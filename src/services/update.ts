import { NpmPackageDto } from '@/types/npm-package.js';
import httpClient, { HttpClient } from '@/utils/http-client.js';
import consola from 'consola';
import { createRequire } from 'module';
import * as semver from 'semver';
const require = createRequire(import.meta.url);
const pkg = require('../../package.json');

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
      if (pkg.version.includes('dev')) {
        console.log(''); // Add an empty line for better readability
        consola.info(
          `You are using a development version of Capawesome CLI (${pkg.version}). The latest stable version is ${latestVersion}.`,
        );
        return;
      }
      if (semver.gt(latestVersion, pkg.version)) {
        consola.warn(
          `New version of Capawesome CLI available: ${pkg.name}@${latestVersion}. Please update to receive the latest features and bug fixes.`,
        );
      }
    } catch (error) {
      console.error('Error while checking for updates:', error);
      consola.warn('Failed to check for updates.');
    }
  }
}

const updateService = new UpdateServiceImpl(httpClient);

export default updateService;
