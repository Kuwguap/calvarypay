/**
 * CalvaryPay API Client
 * Centralized API client with authentication, error handling, and correlation IDs
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { config } from './config';

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  error: {
    code: string;
    message: string;
  } | null;
  meta: {
    correlationId: string;
    timestamp: string;
    service: string;
  };
}

export interface PaginationResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Error Types
export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public correlationId?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// API Client Class
class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: config.api.baseUrl,
      timeout: config.api.timeout,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        try {
          // Ensure headers object exists
          if (!config.headers) {
            config.headers = {};
          }

          // Add correlation ID
          let correlationId: string;
          try {
            correlationId = uuidv4();
          } catch (uuidError) {
            correlationId = `fallback_${Date.now()}_${Math.random().toString(36).substring(7)}`;
            console.warn('UUID generation failed, using fallback:', uuidError);
          }
          config.headers['X-Correlation-ID'] = correlationId;

          // Add authentication token if available
          if (typeof window !== 'undefined') {
            const token = localStorage.getItem('CalvaryPay_token');
            if (token) {
              config.headers['Authorization'] = `Bearer ${token}`;
            }
          }

          // Log request in development
          if (process.env.NODE_ENV === 'development') {
            try {
              const method = config.method?.toUpperCase() || 'UNKNOWN';
              const url = config.url || 'UNKNOWN_URL';
              console.log(`[API Request] ${method} ${url}`, {
                correlationId,
                data: config.data,
              });
            } catch (logError) {
              console.warn('Failed to log API request:', logError);
            }
          }

          return config;
        } catch (error) {
          console.error('Request interceptor error:', error);
          return config;
        }
      },
      (error) => {
        console.error('Request interceptor rejection:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse<ApiResponse>) => {
        try {
          // Log response in development
          if (process.env.NODE_ENV === 'development') {
            try {
              const status = response.status || 'UNKNOWN_STATUS';
              console.log(`[API Response] ${status}`, {
                correlationId: response.data?.meta?.correlationId || 'no-correlation-id',
                data: response.data,
              });
            } catch (logError) {
              console.warn('Failed to log API response:', logError);
            }
          }

          return response;
        } catch (error) {
          console.error('Response interceptor error:', error);
          return response;
        }
      },
      (error) => {
        try {
          // Handle authentication errors
          if (error.response?.status === 401) {
            // Clear stored tokens
            if (typeof window !== 'undefined') {
              localStorage.removeItem('CalvaryPay_token');
              localStorage.removeItem('CalvaryPay_refresh_token');
              localStorage.removeItem('CalvaryPay_user');

              // Redirect to login if not already there
              if (window.location.pathname !== '/auth/signin') {
                window.location.href = '/auth/signin';
              }
            }
          }

          // Transform error to ApiError
          const apiError = new ApiError(
            error.response?.status || 500,
            error.response?.data?.error?.code || 'UNKNOWN_ERROR',
            error.response?.data?.error?.message || error.message,
            error.response?.data?.meta?.correlationId
          );

          // Log error in development
          if (process.env.NODE_ENV === 'development') {
            try {
              console.error('[API Error]', {
                status: apiError.statusCode || 'UNKNOWN_STATUS',
                code: apiError.code || 'UNKNOWN_CODE',
                message: apiError.message || 'Unknown error',
                correlationId: apiError.correlationId || 'no-correlation-id',
              });
            } catch (logError) {
              console.warn('Failed to log API error:', logError);
            }
          }

          return Promise.reject(apiError);
        } catch (interceptorError) {
          console.error('Response interceptor error:', interceptorError);
          return Promise.reject(error);
        }
      }
    );
  }

  // Generic request method
  async request<T = any>(config: AxiosRequestConfig): Promise<T> {
    const response = await this.client.request<ApiResponse<T>>(config);

    console.log('🔍 API Client raw response:', response.data);

    // Our API returns { success, data, error, meta }
    // We want to return the data property
    if (response.data.success) {
      console.log('✅ API request successful, returning data:', response.data.data);
      return response.data.data;
    } else {
      console.log('❌ API request failed:', response.data.error);
      // If not successful, throw an error with the error details
      throw new ApiError(
        400,
        response.data.error?.code || 'API_ERROR',
        response.data.error?.message || 'API request failed',
        response.data.meta?.correlationId
      );
    }
  }

  // HTTP Methods
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'GET', url });
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'POST', url, data });
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'PUT', url, data });
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'PATCH', url, data });
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: 'DELETE', url });
  }

  // File upload method
  async uploadFile<T = any>(url: string, file: File, additionalData?: Record<string, any>): Promise<T> {
    const formData = new FormData();
    formData.append('photo', file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, typeof value === 'string' ? value : JSON.stringify(value));
      });
    }

    return this.request<T>({
      method: 'POST',
      url,
      data: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  // Authentication methods
  async login(email: string, password: string) {
    const response = await this.post<{
      user: any;
      tokens: {
        accessToken: string;
        refreshToken: string;
      };
    }>('/auth/login', { email, password });

    // Store tokens and user data
    if (typeof window !== 'undefined') {
      localStorage.setItem('CalvaryPay_token', response.tokens.accessToken);
      localStorage.setItem('CalvaryPay_refresh_token', response.tokens.refreshToken);
      localStorage.setItem('CalvaryPay_user', JSON.stringify(response.user));
    }

    return response;
  }

  async logout() {
    try {
      await this.post('/auth/logout');
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn('Logout API call failed:', error);
    } finally {
      // Clear stored data
      if (typeof window !== 'undefined') {
        localStorage.removeItem('CalvaryPay_token');
        localStorage.removeItem('CalvaryPay_refresh_token');
        localStorage.removeItem('CalvaryPay_user');
      }
    }
  }

  async refreshToken() {
    if (typeof window === 'undefined') return null;

    const refreshToken = localStorage.getItem('CalvaryPay_refresh_token');
    if (!refreshToken) return null;

    try {
      const response = await this.post<{
        tokens: {
          accessToken: string;
          refreshToken: string;
        };
      }>('/auth/refresh', { refreshToken });

      localStorage.setItem('CalvaryPay_token', response.tokens.accessToken);
      localStorage.setItem('CalvaryPay_refresh_token', response.tokens.refreshToken);

      return response.tokens.accessToken;
    } catch (error) {
      // Clear invalid tokens
      localStorage.removeItem('CalvaryPay_token');
      localStorage.removeItem('CalvaryPay_refresh_token');
      localStorage.removeItem('CalvaryPay_user');
      throw error;
    }
  }

  // Utility methods
  getCurrentUser() {
    if (typeof window === 'undefined') return null;
    
    const userStr = localStorage.getItem('CalvaryPay_user');
    return userStr ? JSON.parse(userStr) : null;
  }

  isAuthenticated() {
    if (typeof window === 'undefined') return false;
    
    return !!localStorage.getItem('CalvaryPay_token');
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Types are already exported above
