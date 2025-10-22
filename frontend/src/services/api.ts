import axios from 'axios';
import type { AxiosInstance } from 'axios';
import { message } from 'antd';
import { API_BASE_URL } from '@/config/constants';
import { getToken, clearAuth } from '@/utils/storage';
import type { ApiResponse, LoginResponse, RegisterFormValues, UserInfo } from '@/types';

interface LoginRequest {
  address: string;
  signature: string;
  message: string;
}

class ApiService {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL||'http://localhost:5000/api',
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });

    // 请求拦截器
    this.axiosInstance.interceptors.request.use(
      (config) => {
        const token = getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // 响应拦截器
    this.axiosInstance.interceptors.response.use(
      (response) => {
        const { data } = response;
        if (data && typeof data.success !== 'undefined' && !data.success) {
          message.error(data.message || '请求失败');
          return Promise.reject(new Error(data.message || '请求失败'));
        }
        return response;
      },
      (error) => {
        if (error.response) {
          const { status, data } = error.response;
          switch (status) {
            case 401:
              message.error('未授权，请重新登录');
              clearAuth();
              window.location.href = '/login';
              break;
            case 403:
              message.error(data?.message || '权限不足');
              break;
            case 404:
              message.error(data?.message || '请求的资源不存在');
              break;
            case 500:
              message.error(data?.message || '服务器错误');
              break;
            default:
              message.error(data?.message || `请求失败 (${status})`);
          }
        } else {
          message.error('网络错误，请检查您的网络连接');
        }
        return Promise.reject(error);
      }
    );
  }

  // 用户注册
  async register(data: RegisterFormValues): Promise<UserInfo> {
    const response = await this.axiosInstance.post<ApiResponse<UserInfo>>('/auth/register', data);
    return response.data.data as UserInfo;
  }

  // 用户登录
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await this.axiosInstance.post<ApiResponse<LoginResponse>>('/auth/login', data);
    console.log(response.data);
    return response.data.data as LoginResponse;
  }

  // 获取当前用户信息
  async getMe(): Promise<UserInfo> {
    const response = await this.axiosInstance.get<ApiResponse<UserInfo>>('/auth/me');
    console.log(response.data);
    return response.data.data as UserInfo;
  }

  // 通用 POST 方法（用于同步接口等）
  async post<T = any>(url: string, data?: any): Promise<T> {
    const response = await this.axiosInstance.post<ApiResponse<T>>(url, data);
    return response.data as T;
  }

  // 通用 GET 方法
  async get<T = any>(url: string, params?: any): Promise<T> {
    const response = await this.axiosInstance.get<ApiResponse<T>>(url, { params });
    return response.data as T;
  }
}

export default new ApiService();

