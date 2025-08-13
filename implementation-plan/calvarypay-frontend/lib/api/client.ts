// API Client with Backend Integration Standards

import type { ApiResponse, PaginatedResponse } from "@/lib/types/api"

class ApiClient {
  private baseUrl: string
  private token: string | null = null

  constructor(baseUrl = "/api/v1") {
    this.baseUrl = baseUrl
  }

  setToken(token: string) {
    this.token = token
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`
    const correlationId = crypto.randomUUID()

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      "X-Correlation-ID": correlationId,
      ...options.headers,
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || "Request failed")
      }

      return data
    } catch (error) {
      return {
        success: false,
        data: null,
        error: {
          code: "NETWORK_ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
        },
        meta: {
          correlationId,
          timestamp: new Date().toISOString(),
          service: "frontend",
        },
      }
    }
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "GET" })
  }

  async post<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    })
  }

  async put<T>(endpoint: string, data: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: "DELETE" })
  }

  async getPaginated<T>(
    endpoint: string,
    params: { page?: number; limit?: number; [key: string]: any } = {},
  ): Promise<PaginatedResponse<T>> {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value))
      }
    })

    const url = `${endpoint}?${searchParams.toString()}`
    return this.request<T[]>(url, { method: "GET" }) as Promise<PaginatedResponse<T>>
  }
}

export const apiClient = new ApiClient()
