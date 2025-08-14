import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import pkg from '../../package.json' with { type: 'json' };
import configService from '../services/config.js';

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
    return axios.delete<T>(urlWithHost, { ...config, headers: { ...this.baseHeaders, ...config?.headers } });
  }

  async get<T>(url: string, config?: AxiosRequestConfig<any> | undefined): Promise<AxiosResponse<T>> {
    const baseUrl = await configService.getValueForKey('API_BASE_URL');
    const urlWithHost = url.startsWith('http') ? url : baseUrl + url;
    return axios.get<T>(urlWithHost, { ...config, headers: { ...this.baseHeaders, ...config?.headers } });
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig<any> | undefined): Promise<AxiosResponse<T>> {
    const baseUrl = await configService.getValueForKey('API_BASE_URL');
    const urlWithHost = url.startsWith('http') ? url : baseUrl + url;
    return axios.patch<T>(urlWithHost, data, { ...config, headers: { ...this.baseHeaders, ...config?.headers } });
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig<any> | undefined): Promise<AxiosResponse<T>> {
    const baseUrl = await configService.getValueForKey('API_BASE_URL');
    const urlWithHost = url.startsWith('http') ? url : baseUrl + url;
    return axios.post<T>(urlWithHost, data, { ...config, headers: { ...this.baseHeaders, ...config?.headers } });
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig<any> | undefined): Promise<AxiosResponse<T>> {
    const baseUrl = await configService.getValueForKey('API_BASE_URL');
    const urlWithHost = url.startsWith('http') ? url : baseUrl + url;
    return axios.put<T>(urlWithHost, data, { ...config, headers: { ...this.baseHeaders, ...config?.headers } });
  }
}

let httpClient: HttpClient = new HttpClientImpl();

export default httpClient;
