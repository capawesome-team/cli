import axios from 'axios'
import { API_URL } from '../config'
import consola from 'consola'

interface SuccessHttpResponse<T> {
  success: true
  status: number
  data: T
}

interface FailureHttpResponse {
  success: false
  status: number
  data: null
}

type HttpResponse<T> = SuccessHttpResponse<T> | FailureHttpResponse

interface HttpClient {
  get<T>(url: string, headers?: Record<string, string>): Promise<HttpResponse<T>>

  post<T>(url: string, data?: any, headers?: Record<string, string>): Promise<HttpResponse<T>>
}

class HttpClientImpl implements HttpClient {
  async get<T>(url: string, headers?: Record<string, string>): Promise<HttpResponse<T>> {
    try {
      const res = await axios.get<T>(API_URL + url, { headers: headers })
      return {
        success: true,
        status: res.status,
        data: res.data
      }
    } catch (e: any) {
      if (e.response.status === 401) {
        consola.error('You are not logged in. Please login first.')
      }
      return {
        success: false,
        status: e.response.status,
        data: null
      }
    }
  }

  async post<T>(url: string, data?: any, headers?: Record<string, string>): Promise<HttpResponse<T>> {
    try {
      const res = await axios.post<T>(API_URL + url, data, { headers: headers })
      return {
        success: true,
        status: res.status,
        data: res.data
      }
    } catch (e: any) {
      if (e.response.status === 401) {
        consola.error('You are not logged in. Please login first.')
      }
      return {
        success: false,
        status: e.response.status,
        data: null
      }
    }
  }

}

let httpClient: HttpClient = new HttpClientImpl()

export default httpClient
