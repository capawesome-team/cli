import { createRequire } from 'module';
import configService from '@/services/config.js';
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
  private readonly baseHeaders = {
    'User-Agent': `Capawesome CLI v${pkg.version}`,
  };

  async delete<T>(url: string, config?: AxiosRequestConfig<any> | undefined): Promise<AxiosResponse<T>> {
    const baseUrl = await configService.getValueForKey('API_BASE_URL');
    const urlWithHost = url.startsWith('http') ? url : baseUrl + url;
    const proxyAgent = getProxyAgent(urlWithHost);
    const axiosConfig: AxiosRequestConfig = {
      ...config,
      headers: { ...this.baseHeaders, ...config?.headers },
      ...(proxyAgent && urlWithHost.startsWith('https://') ? { httpsAgent: proxyAgent } : {}),
      ...(proxyAgent && urlWithHost.startsWith('http://') ? { httpAgent: proxyAgent } : {}),
    };
    return axios.delete<T>(urlWithHost, axiosConfig);
  }

  async get<T>(url: string, config?: AxiosRequestConfig<any> | undefined): Promise<AxiosResponse<T>> {
    const baseUrl = await configService.getValueForKey('API_BASE_URL');
    const urlWithHost = url.startsWith('http') ? url : baseUrl + url;
    const proxyAgent = getProxyAgent(urlWithHost);
    const axiosConfig: AxiosRequestConfig = {
      ...config,
      headers: { ...this.baseHeaders, ...config?.headers },
      ...(proxyAgent && urlWithHost.startsWith('https://') ? { httpsAgent: proxyAgent } : {}),
      ...(proxyAgent && urlWithHost.startsWith('http://') ? { httpAgent: proxyAgent } : {}),
    };
    return axios.get<T>(urlWithHost, axiosConfig);
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig<any> | undefined): Promise<AxiosResponse<T>> {
    const baseUrl = await configService.getValueForKey('API_BASE_URL');
    const urlWithHost = url.startsWith('http') ? url : baseUrl + url;
    const proxyAgent = getProxyAgent(urlWithHost);
    const axiosConfig: AxiosRequestConfig = {
      ...config,
      headers: { ...this.baseHeaders, ...config?.headers },
      ...(proxyAgent && urlWithHost.startsWith('https://') ? { httpsAgent: proxyAgent } : {}),
      ...(proxyAgent && urlWithHost.startsWith('http://') ? { httpAgent: proxyAgent } : {}),
    };
    return axios.patch<T>(urlWithHost, data, axiosConfig);
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig<any> | undefined): Promise<AxiosResponse<T>> {
    const baseUrl = await configService.getValueForKey('API_BASE_URL');
    const urlWithHost = url.startsWith('http') ? url : baseUrl + url;
    const proxyAgent = getProxyAgent(urlWithHost);
    const axiosConfig: AxiosRequestConfig = {
      ...config,
      headers: { ...this.baseHeaders, ...config?.headers },
      ...(proxyAgent && urlWithHost.startsWith('https://') ? { httpsAgent: proxyAgent } : {}),
      ...(proxyAgent && urlWithHost.startsWith('http://') ? { httpAgent: proxyAgent } : {}),
    };
    return axios.post<T>(urlWithHost, data, axiosConfig);
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig<any> | undefined): Promise<AxiosResponse<T>> {
    const baseUrl = await configService.getValueForKey('API_BASE_URL');
    const urlWithHost = url.startsWith('http') ? url : baseUrl + url;
    const proxyAgent = getProxyAgent(urlWithHost);
    const axiosConfig: AxiosRequestConfig = {
      ...config,
      headers: { ...this.baseHeaders, ...config?.headers },
      ...(proxyAgent && urlWithHost.startsWith('https://') ? { httpsAgent: proxyAgent } : {}),
      ...(proxyAgent && urlWithHost.startsWith('http://') ? { httpAgent: proxyAgent } : {}),
    };
    return axios.put<T>(urlWithHost, data, axiosConfig);
  }
}

let httpClient: HttpClient = new HttpClientImpl();

export default httpClient;
