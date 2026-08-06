import { createRequire } from 'module';
import configService from '@/services/config.js';
import { getInstallationId } from '@/utils/installation-id.js';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import axiosRetry from 'axios-retry';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
const require = createRequire(import.meta.url);
const pkg = require('../../package.json');

// Register middleware to retry failed requests
axiosRetry(axios, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    // Network errors and 5xx responses are retried
    return (
      axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      (error.response?.status !== undefined && error.response.status >= 500)
    );
  },
});

/**
 * Gets the appropriate proxy agent based on the target URL protocol and environment variables.
 * This ensures that HTTPS requests use HTTPS even when the proxy itself is accessed via HTTP.
 */
function getProxyAgent(targetUrl: string): HttpProxyAgent<string> | HttpsProxyAgent<string> | undefined {
  const isHttps = targetUrl.startsWith('https://');
  const proxyUrl = isHttps
    ? process.env.HTTPS_PROXY || process.env.https_proxy
    : process.env.HTTP_PROXY || process.env.http_proxy;

  if (!proxyUrl) {
    return undefined;
  }

  // Use the appropriate agent based on the TARGET protocol, not the proxy protocol
  // This allows using an HTTP proxy for HTTPS requests
  return isHttps ? new HttpsProxyAgent(proxyUrl) : new HttpProxyAgent(proxyUrl);
}

export interface HttpClient {
  delete<T>(url: string, config?: AxiosRequestConfig<any> | undefined): Promise<AxiosResponse<T>>;
  get<T>(url: string, config?: AxiosRequestConfig<any> | undefined): Promise<AxiosResponse<T>>;
  patch<T>(url: string, data?: any, config?: AxiosRequestConfig<any> | undefined): Promise<AxiosResponse<T>>;
  post<T>(url: string, data?: any, config?: AxiosRequestConfig<any> | undefined): Promise<AxiosResponse<T>>;
  put<T>(url: string, data?: any, config?: AxiosRequestConfig<any> | undefined): Promise<AxiosResponse<T>>;
}

class HttpClientImpl implements HttpClient {
  async delete<T>(url: string, config?: AxiosRequestConfig<any> | undefined): Promise<AxiosResponse<T>> {
    const request = await this.createRequest(url, config);
    return axios.delete<T>(request.url, request.config);
  }

  async get<T>(url: string, config?: AxiosRequestConfig<any> | undefined): Promise<AxiosResponse<T>> {
    const request = await this.createRequest(url, config);
    return axios.get<T>(request.url, request.config);
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig<any> | undefined): Promise<AxiosResponse<T>> {
    const request = await this.createRequest(url, config);
    return axios.patch<T>(request.url, data, request.config);
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig<any> | undefined): Promise<AxiosResponse<T>> {
    const request = await this.createRequest(url, config);
    return axios.post<T>(request.url, data, request.config);
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig<any> | undefined): Promise<AxiosResponse<T>> {
    const request = await this.createRequest(url, config);
    return axios.put<T>(request.url, data, request.config);
  }

  private async createRequest(
    url: string,
    config: AxiosRequestConfig<any> | undefined,
  ): Promise<{ config: AxiosRequestConfig; url: string }> {
    // Only relative urls target the Capawesome API. Absolute urls point to third parties
    // (e.g. the npm registry) and must not receive the installation id.
    const isApiRequest = !url.startsWith('http');
    const baseUrl = await configService.getValueForKey('API_BASE_URL');
    const urlWithHost = isApiRequest ? baseUrl + url : url;
    const proxyAgent = getProxyAgent(urlWithHost);
    return {
      config: {
        ...config,
        headers: { ...this.createBaseHeaders(isApiRequest), ...config?.headers },
        ...(proxyAgent && urlWithHost.startsWith('https://') ? { httpsAgent: proxyAgent, proxy: false } : {}),
        ...(proxyAgent && urlWithHost.startsWith('http://') ? { httpAgent: proxyAgent, proxy: false } : {}),
      },
      url: urlWithHost,
    };
  }

  private createBaseHeaders(isApiRequest: boolean): Record<string, string> {
    const installationId = isApiRequest ? getInstallationId() : undefined;
    return {
      'User-Agent': `Capawesome CLI v${pkg.version}`,
      ...(installationId ? { 'X-Capawesome-Installation-Id': installationId } : {}),
    };
  }
}

let httpClient: HttpClient = new HttpClientImpl();

export default httpClient;
