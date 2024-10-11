import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { API_URL } from '../config';

export interface HttpClient {
  delete<T>(url: string, config?: AxiosRequestConfig<any> | undefined): Promise<AxiosResponse<T>>;
  get<T>(url: string, config?: AxiosRequestConfig<any> | undefined): Promise<AxiosResponse<T>>;
  patch<T>(url: string, data?: any, config?: AxiosRequestConfig<any> | undefined): Promise<AxiosResponse<T>>;
  post<T>(url: string, data?: any, config?: AxiosRequestConfig<any> | undefined): Promise<AxiosResponse<T>>;
  put<T>(url: string, data?: any, config?: AxiosRequestConfig<any> | undefined): Promise<AxiosResponse<T>>;
}

class HttpClientImpl implements HttpClient {
  delete<T>(url: string, config?: AxiosRequestConfig<any> | undefined): Promise<AxiosResponse<T>> {
    const urlWithHost = url.startsWith('http') ? url : API_URL + url;
    return axios.delete<T>(urlWithHost, config);
  }

  get<T>(url: string, config?: AxiosRequestConfig<any> | undefined): Promise<AxiosResponse<T>> {
    const urlWithHost = url.startsWith('http') ? url : API_URL + url;
    return axios.get<T>(urlWithHost, config);
  }

  patch<T>(url: string, data?: any, config?: AxiosRequestConfig<any> | undefined): Promise<AxiosResponse<T>> {
    const urlWithHost = url.startsWith('http') ? url : API_URL + url;
    return axios.patch<T>(urlWithHost, data, config);
  }

  post<T>(url: string, data?: any, config?: AxiosRequestConfig<any> | undefined): Promise<AxiosResponse<T>> {
    const urlWithHost = url.startsWith('http') ? url : API_URL + url;
    return axios.post<T>(urlWithHost, data, config);
  }

  put<T>(url: string, data?: any, config?: AxiosRequestConfig<any> | undefined): Promise<AxiosResponse<T>> {
    const urlWithHost = url.startsWith('http') ? url : API_URL + url;
    return axios.put<T>(urlWithHost, data, config);
  }
}

let httpClient: HttpClient = new HttpClientImpl();

export default httpClient;
