import { createRequire } from 'module';
import configService from '@/services/config.js';
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import axiosRetry from 'axios-retry';
import * as ciInfo from 'ci-info';
import consola from 'consola';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
const require = createRequire(import.meta.url);
const pkg = require('../../package.json');

const CLIENT_HEADER_NAME = 'X-Capawesome-Client';

const isRateLimitError = (error: AxiosError): boolean => error.response?.status === 429;

// Register middleware to retry failed requests
axiosRetry(axios, {
  retries: 3,
  // Waits at least as long as the `Retry-After` header of rate limited responses
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    // Network errors, rate limited requests and 5xx responses are retried
    return (
      axiosRetry.isNetworkOrIdempotentRequestError(error) ||
      isRateLimitError(error) ||
      (error.response?.status !== undefined && error.response.status >= 500)
    );
  },
  onRetry: (_retryCount, error) => {
    if (isRateLimitError(error)) {
      consola.warn('Rate limit reached. Retrying...');
    }
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

// A product-token list, as npm's User-Agent is: the CLI's token, then ` ci/<provider>` in CI.
function resolveClientHeader(): string {
  const clientToken = `cli/${pkg.version}`;
  return ciInfo.isCI ? `${clientToken} ci/${resolveCiProvider()}` : clientToken;
}

// The API takes the provider as lowercase letters, digits and dashes: `GitHub Actions` is `github-actions`.
function resolveCiProvider(): string {
  return ciInfo.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-') ?? 'unknown';
}

export interface HttpClient {
  delete<T>(url: string, config?: AxiosRequestConfig<any> | undefined): Promise<AxiosResponse<T>>;
  get<T>(url: string, config?: AxiosRequestConfig<any> | undefined): Promise<AxiosResponse<T>>;
  patch<T>(url: string, data?: any, config?: AxiosRequestConfig<any> | undefined): Promise<AxiosResponse<T>>;
  post<T>(url: string, data?: any, config?: AxiosRequestConfig<any> | undefined): Promise<AxiosResponse<T>>;
  put<T>(url: string, data?: any, config?: AxiosRequestConfig<any> | undefined): Promise<AxiosResponse<T>>;
  request<T>(config: AxiosRequestConfig & { url: string }): Promise<AxiosResponse<T>>;
}

class HttpClientImpl implements HttpClient {
  private readonly baseHeaders = {
    'User-Agent': `capawesome-cli/${pkg.version}`,
  };

  async delete<T>(url: string, config?: AxiosRequestConfig<any> | undefined): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }

  async get<T>(url: string, config?: AxiosRequestConfig<any> | undefined): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig<any> | undefined): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, data, method: 'PATCH', url });
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig<any> | undefined): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, data, method: 'POST', url });
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig<any> | undefined): Promise<AxiosResponse<T>> {
    return this.request<T>({ ...config, data, method: 'PUT', url });
  }

  async request<T>(config: AxiosRequestConfig & { url: string }): Promise<AxiosResponse<T>> {
    const baseUrl = await configService.getValueForKey('API_BASE_URL');
    const isApiRequest = !config.url.startsWith('http');
    const urlWithHost = isApiRequest ? baseUrl + config.url : config.url;
    const apiHeaders = isApiRequest ? { [CLIENT_HEADER_NAME]: resolveClientHeader() } : {};
    const proxyAgent = getProxyAgent(urlWithHost);
    const axiosConfig: AxiosRequestConfig = {
      ...config,
      url: urlWithHost,
      headers: { ...this.baseHeaders, ...apiHeaders, ...config.headers },
      ...(proxyAgent && urlWithHost.startsWith('https://') ? { httpsAgent: proxyAgent, proxy: false } : {}),
      ...(proxyAgent && urlWithHost.startsWith('http://') ? { httpAgent: proxyAgent, proxy: false } : {}),
    };
    return axios.request<T>(axiosConfig);
  }
}

let httpClient: HttpClient = new HttpClientImpl();

export default httpClient;
