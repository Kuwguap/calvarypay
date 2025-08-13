/**
 * API Client for CalvaryPay
 * Centralized HTTP client with error handling and authentication
 */

export interface ApiResponse<T = any> {
  data?: T
  error?: {
    message: string
    details?: any
  }
  message?: string
}

class ApiClient {
  private baseURL: string

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || '/api'
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    }

    // Add auth token if available
    const token = this.getAuthToken()
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      }
    }

    try {
      console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`)
      
      const response = await fetch(url, config)
      const data = await response.json()

      if (!response.ok) {
        console.error(`❌ API Error: ${response.status}`, data)
        return {
          error: data.error || { message: `HTTP ${response.status}` }
        }
      }

      console.log(`✅ API Success: ${options.method || 'GET'} ${url}`)
      return data
    } catch (error) {
      console.error(`❌ Network Error:`, error)
      return {
        error: {
          message: 'Network error. Please check your connection.',
          details: error
        }
      }
    }
  }

  private getAuthToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('auth_token')
  }

  public setAuthToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token)
    }
  }

  public clearAuthToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
    }
  }

  // HTTP Methods
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }
}

export const apiClient = new ApiClient()

// Utility function for handling API responses
export function handleApiResponse<T>(response: ApiResponse<T>): T {
  if (response.error) {
    throw new Error(response.error.message)
  }
  return response.data as T
}

// Error types
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public details?: any
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Network error') {
    super(message)
    this.name = 'NetworkError'
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: Record<string, string>
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}
