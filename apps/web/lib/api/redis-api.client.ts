/**
 * Redis-Enhanced API Client
 * Provides intelligent caching, request deduplication, and performance optimization
 */

import { redisService, cacheUtils, CACHE_TTL } from '@/lib/services/redis.service'

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  headers?: Record<string, string>
  body?: any
  cache?: {
    enabled: boolean
    ttl?: number
    tags?: string[]
    key?: string
  }
  deduplication?: {
    enabled: boolean
    ttl?: number
  }
}

export interface ApiResponse<T = any> {
  data: T
  status: number
  headers: Headers
  cached: boolean
  timestamp: number
}

export class RedisApiClient {
  private baseUrl: string
  private defaultHeaders: Record<string, string>

  constructor(baseUrl: string, defaultHeaders: Record<string, string> = {}) {
    this.baseUrl = baseUrl
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...defaultHeaders
    }
  }

  /**
   * Make a cached GET request
   */
  async get<T>(
    endpoint: string,
    options: Omit<ApiRequestOptions, 'method'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  /**
   * Make a POST request (no caching)
   */
  async post<T>(
    endpoint: string,
    options: Omit<ApiRequestOptions, 'method'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST' })
  }

  /**
   * Make a PUT request (no caching)
   */
  async put<T>(
    endpoint: string,
    options: Omit<ApiRequestOptions, 'method'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PUT' })
  }

  /**
   * Make a PATCH request (no caching)
   */
  async patch<T>(
    endpoint: string,
    options: Omit<ApiRequestOptions, 'method'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH' })
  }

  /**
   * Make a DELETE request (no caching)
   */
  async delete<T>(
    endpoint: string,
    options: Omit<ApiRequestOptions, 'method'> = {}
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }

  /**
   * Main request method with caching and deduplication
   */
  private async request<T>(
    endpoint: string,
    options: ApiRequestOptions
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      headers = {},
      body,
      cache = { enabled: true, ttl: CACHE_TTL.STATS },
      deduplication = { enabled: true, ttl: 5 }
    } = options

    const url = `${this.baseUrl}${endpoint}`
    const requestKey = this.generateRequestKey(method, url, body)
    
    // Check cache for GET requests
    if (method === 'GET' && cache.enabled) {
      const cacheKey = cache.key || requestKey
      const cached = await redisService.get<T>(cacheKey)
      
      if (cached) {
        return {
          data: cached,
          status: 200,
          headers: new Headers(),
          cached: true,
          timestamp: Date.now()
        }
      }
    }

    // Check for duplicate requests
    if (deduplication.enabled) {
      const duplicateKey = `duplicate:${requestKey}`
      const isDuplicate = await redisService.exists(duplicateKey)
      
      if (isDuplicate) {
        // Wait for the duplicate request to complete
        const result = await this.waitForDuplicateRequest<T>(duplicateKey, deduplication.ttl!)
        if (result) {
          return result
        }
      } else {
        // Mark this as an ongoing request
        await redisService.set(duplicateKey, 'processing', { ttl: deduplication.ttl! })
      }
    }

    try {
      const response = await fetch(url, {
        method,
        headers: {
          ...this.defaultHeaders,
          ...headers
        },
        body: body ? JSON.stringify(body) : undefined
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()

      // Cache successful GET responses
      if (method === 'GET' && cache.enabled) {
        const cacheKey = cache.key || requestKey
        await redisService.set(cacheKey, data, {
          ttl: cache.ttl || CACHE_TTL.STATS,
          tags: cache.tags || []
        })
      }

      // Clear duplicate request marker
      if (deduplication.enabled) {
        const duplicateKey = `duplicate:${requestKey}`
        await redisService.del(duplicateKey)
      }

      return {
        data,
        status: response.status,
        headers: response.headers,
        cached: false,
        timestamp: Date.now()
      }
    } catch (error) {
      // Clear duplicate request marker on error
      if (deduplication.enabled) {
        const duplicateKey = `duplicate:${requestKey}`
        await redisService.del(duplicateKey)
      }
      throw error
    }
  }

  /**
   * Wait for a duplicate request to complete
   */
  private async waitForDuplicateRequest<T>(
    duplicateKey: string,
    timeout: number
  ): Promise<ApiResponse<T> | null> {
    const startTime = Date.now()
    const maxWaitTime = timeout * 1000

    while (Date.now() - startTime < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 100)) // Wait 100ms
      
      const status = await redisService.get(duplicateKey)
      if (status !== 'processing') {
        // Request completed, try to get the result
        const resultKey = duplicateKey.replace('duplicate:', 'result:')
        const result = await redisService.get<ApiResponse<T>>(resultKey)
        
        if (result) {
          await redisService.del(resultKey) // Clean up
          return result
        }
      }
    }

    return null
  }

  /**
   * Generate a unique key for the request
   */
  private generateRequestKey(method: string, url: string, body?: any): string {
    const bodyHash = body ? JSON.stringify(body) : ''
    return `${method}:${url}:${bodyHash}`
  }

  /**
   * Prefetch and cache data
   */
  async prefetch<T>(
    endpoint: string,
    cacheKey: string,
    options: {
      ttl?: number
      tags?: string[]
    } = {}
  ): Promise<void> {
    try {
      const response = await this.get<T>(endpoint, {
        cache: {
          enabled: true,
          key: cacheKey,
          ttl: options.ttl || CACHE_TTL.STATS,
          tags: options.tags || []
        }
      })

      if (response.data) {
        console.log(`✅ Prefetched and cached: ${cacheKey}`)
      }
    } catch (error) {
      console.error(`❌ Prefetch failed for ${cacheKey}:`, error)
    }
  }

  /**
   * Batch multiple requests with caching
   */
  async batch<T extends Record<string, any>>(
    requests: Array<{
      key: string
      endpoint: string
      cache?: {
        ttl?: number
        tags?: string[]
      }
    }>
  ): Promise<T> {
    const results: T = {} as T
    const cacheKeys = requests.map(r => r.key)
    
    // Try to get all from cache first
    const cachedResults = await redisService.mget<any>(cacheKeys)
    
    const uncachedRequests = requests.filter((_, index) => !cachedResults[index])
    
    // Fetch uncached requests
    if (uncachedRequests.length > 0) {
      const fetchPromises = uncachedRequests.map(async (request, index) => {
        const originalIndex = requests.findIndex(r => r.key === request.key)
        const response = await this.get(request.endpoint, {
          cache: {
            enabled: true,
            key: request.key,
            ttl: request.cache?.ttl || CACHE_TTL.STATS,
            tags: request.cache?.tags || []
          }
        })
        
        return { key: request.key, data: response.data, originalIndex }
      })

      const fetchedResults = await Promise.all(fetchPromises)
      
      // Merge fetched results
      fetchedResults.forEach(({ key, data, originalIndex }) => {
        results[key] = data
        cachedResults[originalIndex] = data
      })
    }

    // Merge cached results
    requests.forEach((request, index) => {
      if (cachedResults[index]) {
        results[request.key] = cachedResults[index]
      }
    })

    return results
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidateCache(pattern: string): Promise<void> {
    try {
      // This is a simplified invalidation - in production you might want more sophisticated patterns
      await redisService.invalidateByTags([pattern])
    } catch (error) {
      console.error('Cache invalidation failed:', error)
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalKeys: number
    memoryUsage: string
    hitRate: number
  }> {
    return redisService.getStats()
  }
}

// Create default API client instance
export const apiClient = new RedisApiClient(
  process.env.NEXT_PUBLIC_API_BASE_URL || '/api'
)

// Create authenticated API client
export const createAuthenticatedClient = (token: string) => {
  return new RedisApiClient(
    process.env.NEXT_PUBLIC_API_BASE_URL || '/api',
    {
      'Authorization': `Bearer ${token}`
    }
  )
}

// Utility functions for common API patterns
export const apiUtils = {
  // User-specific API calls with caching
  user: <T>(
    userId: string,
    endpoint: string,
    token: string,
    options: {
      ttl?: number
      tags?: string[]
    } = {}
  ) => {
    const client = createAuthenticatedClient(token)
    const cacheKey = cacheUtils.userKey(userId, endpoint.split('/').pop() || 'data')
    
    return client.get<T>(endpoint, {
      cache: {
        enabled: true,
        key: cacheKey,
        ttl: options.ttl || CACHE_TTL.USER_SESSION,
        tags: [cacheUtils.tags.user(userId), ...(options.tags || [])]
      }
    })
  },

  // Company-specific API calls with caching
  company: <T>(
    companyId: string,
    endpoint: string,
    token: string,
    options: {
      ttl?: number
      tags?: string[]
    } = {}
  ) => {
    const client = createAuthenticatedClient(token)
    const cacheKey = cacheUtils.companyKey(companyId, endpoint.split('/').pop() || 'data')
    
    return client.get<T>(endpoint, {
      cache: {
        enabled: true,
        key: cacheKey,
        ttl: options.ttl || CACHE_TTL.COMPANY_DATA,
        tags: [cacheUtils.tags.company(companyId), ...(options.tags || [])]
      }
    })
  },

  // Global API calls with caching
  global: <T>(
    endpoint: string,
    options: {
      ttl?: number
      tags?: string[]
    } = {}
  ) => {
    const cacheKey = cacheUtils.globalKey(endpoint.split('/').pop() || 'data')
    
    return apiClient.get<T>(endpoint, {
      cache: {
        enabled: true,
        key: cacheKey,
        ttl: options.ttl || CACHE_TTL.STATIC_CONTENT,
        tags: [cacheUtils.tags.global(), ...(options.tags || [])]
      }
    })
  }
} 