import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { API_URL } from '../config';

export interface HttpClient {
  delete<T>(url: string, config?: AxiosRequestConfig<any> | undefined): Promise<AxiosResponse<T>>;
  get<T>(url: string, config?: AxiosRequestConfig<any> | undefined): Promise<AxiosResponse<T>>;
  patch<T>(url: string, data?: any, config?: AxiosRequestConfig<any> | undefined): Promise<AxiosResponse<T>>;
  post<T>(url: string, data?: any, config?: AxiosRequestConfig<any> | undefined): Promise<AxiosResponse<T>>;
}

class HttpClientImpl implements HttpClient {
  delete<T>(url: string, config?: AxiosRequestConfig<any> | undefined): Promise<AxiosResponse<T>> {
    const urlWithHost = url.startsWith('http') ? url : API_URL + url;
    return axios.delete<T>(urlWithHost, config);
  }

  async get<T>(url: string, config?: AxiosRequestConfig<any> | undefined): Promise<AxiosResponse<T>> {
    const urlWithHost = url.startsWith('http') ? url : API_URL + url;
    return axios.get<T>(urlWithHost, config);
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig<any> | undefined): Promise<AxiosResponse<T>> {
    const urlWithHost = url.startsWith('http') ? url : API_URL + url;
    return axios.patch<T>(urlWithHost, data, config);
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig<any> | undefined): Promise<AxiosResponse<T>> {
    const urlWithHost = url.startsWith('http') ? url : API_URL + url;
    return axios.post<T>(urlWithHost, data, config);
  }
}

let httpClient: HttpClient = new HttpClientImpl();

export default httpClient;
