import axios, { AxiosRequestConfig } from 'axios';
import { API_URL } from '../config';

interface SuccessHttpResponse<T> {
  success: true;
  status: number;
  data: T;
}

interface FailureHttpResponse {
  success: false;
  status: number;
  error: any;
}

type HttpResponse<T> = SuccessHttpResponse<T> | FailureHttpResponse;

export interface HttpClient {
  delete<T>(url: string, config?: AxiosRequestConfig<any> | undefined): Promise<HttpResponse<T>>;
  get<T>(url: string, config?: AxiosRequestConfig<any> | undefined): Promise<HttpResponse<T>>;
  patch<T>(url: string, data?: any, config?: AxiosRequestConfig<any> | undefined): Promise<HttpResponse<T>>;
  post<T>(url: string, data?: any, config?: AxiosRequestConfig<any> | undefined): Promise<HttpResponse<T>>;
}

class HttpClientImpl implements HttpClient {
  async delete<T>(url: string, config?: AxiosRequestConfig<any> | undefined): Promise<HttpResponse<T>> {
    try {
      const res = await axios.delete<T>(API_URL + url, config);
      return {
        success: true,
        status: res.status,
        data: res.data,
      };
    } catch (e: any) {
      return {
        success: false,
        status: e.response.status,
        error: e,
      };
    }
  }

  async get<T>(url: string, config?: AxiosRequestConfig<any> | undefined): Promise<HttpResponse<T>> {
    try {
      const res = await axios.get<T>(API_URL + url, config);
      return {
        success: true,
        status: res.status,
        data: res.data,
      };
    } catch (e: any) {
      return {
        success: false,
        status: e.response.status,
        error: e,
      };
    }
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig<any> | undefined): Promise<HttpResponse<T>> {
    try {
      const res = await axios.patch<T>(API_URL + url, data, config);
      return {
        success: true,
        status: res.status,
        data: res.data,
      };
    } catch (e: any) {
      return {
        success: false,
        status: e.response.status,
        error: e,
      };
    }
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig<any> | undefined): Promise<HttpResponse<T>> {
    try {
      const res = await axios.post<T>(API_URL + url, data, config);
      return {
        success: true,
        status: res.status,
        data: res.data,
      };
    } catch (e: any) {
      return {
        success: false,
        status: e.response.status,
        error: e,
      };
    }
  }
}

let httpClient: HttpClient = new HttpClientImpl();

export default httpClient;
