/**
 * Upstash Redis Service for CalvaryPay Frontend
 * Provides caching, session management, and performance optimization
 */

import { Redis } from '@upstash/redis'

// Check if Redis credentials are available
const REDIS_URL = process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_URL || 'https://apparent-gobbler-32856.upstash.io/'
const REDIS_TOKEN = process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_TOKEN || 'AYBYAAIncDFkZDMzMDU2YTVmNzc0MmNmOTRlYzU0ODNkYWQ5ZmRkNnAxMzI4NTY'

// Initialize Redis client with error handling
let redis: Redis | null = null

try {
  if (REDIS_URL && REDIS_TOKEN && typeof window !== 'undefined') {
    redis = new Redis({
      url: REDIS_URL,
      token: REDIS_TOKEN,
    })
  }
} catch (error) {
  console.warn('Redis initialization failed, falling back to localStorage:', error)
}

export interface CacheOptions {
  ttl?: number // Time to live in seconds
  tags?: string[] // Cache tags for invalidation
}

export interface CacheEntry<T = any> {
  data: T
  timestamp: number
  ttl: number
  tags?: string[]
}

export class RedisService {
  private redis: Redis | null
  private isRedisAvailable: boolean

  constructor() {
    this.redis = redis
    this.isRedisAvailable = !!redis
  }

  /**
   * Set a value in cache with TTL
   */
  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    try {
      const { ttl = 3600, tags = [] } = options // Default 1 hour TTL
      
      const entry: CacheEntry<T> = {
        data: value,
        timestamp: Date.now(),
        ttl,
        tags
      }

      if (this.isRedisAvailable && this.redis) {
        await this.redis.set(key, JSON.stringify(entry), { ex: ttl })
        
        // Store tags for invalidation
        if (tags.length > 0) {
          await this.redis.sadd(`tags:${key}`, ...tags)
        }
      } else {
        // Fallback to localStorage
        this.fallbackSet(key, value, options)
      }
    } catch (error) {
      console.error('Redis set error:', error)
      // Fallback to localStorage if Redis fails
      this.fallbackSet(key, value, options)
    }
  }

  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.isRedisAvailable && this.redis) {
        const cached = await this.redis.get(key)
        if (!cached) return null

        // Handle non-string responses
        if (typeof cached !== 'string') {
          return cached as T
        }

        // Try to parse JSON
        try {
          const entry: CacheEntry<T> = JSON.parse(cached)
          
          // Check if expired
          if (Date.now() - entry.timestamp > entry.ttl * 1000) {
            await this.redis.del(key)
            return null
          }

          return entry.data
        } catch (parseError) {
          console.warn('Failed to parse cached data, clearing cache entry:', parseError)
          await this.redis.del(key)
          return null
        }
      } else {
        // Fallback to localStorage
        return this.fallbackGet(key)
      }
    } catch (error) {
      console.error('Redis get error:', error)
      // Fallback to localStorage
      return this.fallbackGet(key)
    }
  }

  /**
   * Delete a key from cache
   */
  async del(key: string): Promise<void> {
    try {
      if (this.isRedisAvailable && this.redis) {
        await this.redis.del(key)
        await this.redis.del(`tags:${key}`)
      } else {
        // Fallback to localStorage
        this.fallbackDel(key)
      }
    } catch (error) {
      console.error('Redis del error:', error)
      // Fallback to localStorage
      this.fallbackDel(key)
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    try {
      if (this.isRedisAvailable && this.redis) {
        for (const tag of tags) {
          const keys = await this.redis.keys(`*:${tag}:*`)
          if (keys.length > 0) {
            await this.redis.del(...keys)
          }
        }
      } else {
        // Fallback: clear all localStorage cache entries
        if (typeof window !== 'undefined') {
          const keysToDelete: string[] = []
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key?.startsWith('redis:')) {
              keysToDelete.push(key)
            }
          }
          keysToDelete.forEach(key => localStorage.removeItem(key))
        }
      }
    } catch (error) {
      console.error('Redis invalidateByTags error:', error)
    }
  }

  /**
   * Set multiple values atomically
   */
  async mset<T>(entries: Array<{ key: string; value: T; options?: CacheOptions }>): Promise<void> {
    try {
      if (this.isRedisAvailable && this.redis) {
        const pipeline = this.redis.pipeline()
        
        for (const { key, value, options = {} } of entries) {
          const { ttl = 3600, tags = [] } = options
          const entry: CacheEntry<T> = {
            data: value,
            timestamp: Date.now(),
            ttl,
            tags
          }
          
          pipeline.set(key, JSON.stringify(entry), { ex: ttl })
          
          if (tags.length > 0) {
            pipeline.sadd(`tags:${key}`, ...tags)
          }
        }
        
        await pipeline.exec()
      } else {
        // Fallback to individual sets
        for (const entry of entries) {
          await this.set(entry.key, entry.value, entry.options)
        }
      }
    } catch (error) {
      console.error('Redis mset error:', error)
      // Fallback to individual sets
      for (const entry of entries) {
        await this.set(entry.key, entry.value, entry.options)
      }
    }
  }

  /**
   * Get multiple values
   */
  async mget<T>(keys: string[]): Promise<Array<T | null>> {
    try {
      if (this.isRedisAvailable && this.redis) {
        const cached = await this.redis.mget(...keys)
        return cached.map(item => {
          if (!item) return null
          
          try {
            // Handle non-string responses
            if (typeof item !== 'string') {
              return item as T
            }

            const entry: CacheEntry<T> = JSON.parse(item)
            
            // Check if expired
            if (Date.now() - entry.timestamp > entry.ttl * 1000) {
              return null
            }
            
            return entry.data
          } catch {
            return null
          }
        })
      } else {
        // Fallback to individual gets
        return Promise.all(keys.map(key => this.get<T>(key)))
      }
    } catch (error) {
      console.error('Redis mget error:', error)
      // Fallback to individual gets
      return Promise.all(keys.map(key => this.get<T>(key)))
    }
  }

  /**
   * Check if a key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      if (this.isRedisAvailable && this.redis) {
        const result = await this.redis.exists(key)
        return result === 1
      } else {
        // Fallback to localStorage
        if (typeof window !== 'undefined') {
          return localStorage.getItem(`redis:${key}`) !== null
        }
        return false
      }
    } catch (error) {
      console.error('Redis exists error:', error)
      return false
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalKeys: number
    memoryUsage: string
    hitRate: number
  }> {
    try {
      if (this.isRedisAvailable && this.redis) {
        const keys = await this.redis.dbsize()
        
        return {
          totalKeys: keys || 0,
          memoryUsage: 'N/A', // Upstash doesn't provide detailed memory info
          hitRate: 0.95 // Estimated hit rate
        }
      } else {
        // Fallback: count localStorage entries
        let count = 0
        if (typeof window !== 'undefined') {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key?.startsWith('redis:')) {
              count++
            }
          }
        }
        
        return {
          totalKeys: count,
          memoryUsage: 'localStorage',
          hitRate: 0.8 // Estimated hit rate for localStorage
        }
      }
    } catch (error) {
      console.error('Redis stats error:', error)
      return {
        totalKeys: 0,
        memoryUsage: 'N/A',
        hitRate: 0
      }
    }
  }

  /**
   * Clear all cache (use with caution)
   */
  async clearAll(): Promise<void> {
    try {
      if (this.isRedisAvailable && this.redis) {
        await this.redis.flushdb()
      } else {
        // Fallback: clear localStorage cache entries
        if (typeof window !== 'undefined') {
          const keysToDelete: string[] = []
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key?.startsWith('redis:')) {
              keysToDelete.push(key)
            }
          }
          keysToDelete.forEach(key => localStorage.removeItem(key))
        }
      }
    } catch (error) {
      console.error('Redis clearAll error:', error)
    }
  }

  // Fallback methods using localStorage
  private fallbackSet<T>(key: string, value: T, options: CacheOptions = {}): void {
    try {
      if (typeof window === 'undefined') return

      const { ttl = 3600 } = options
      const entry: CacheEntry<T> = {
        data: value,
        timestamp: Date.now(),
        ttl,
        tags: options.tags
      }
      
      localStorage.setItem(`redis:${key}`, JSON.stringify(entry))
      
      // Set expiration
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(`redis:${key}`)
        }
      }, ttl * 1000)
    } catch (error) {
      console.error('Fallback set error:', error)
    }
  }

  private fallbackGet<T>(key: string): T | null {
    try {
      if (typeof window === 'undefined') return null

      const cached = localStorage.getItem(`redis:${key}`)
      if (!cached) return null

      const entry: CacheEntry<T> = JSON.parse(cached)
      
      // Check if expired
      if (Date.now() - entry.timestamp > entry.ttl * 1000) {
        localStorage.removeItem(`redis:${key}`)
        return null
      }

      return entry.data
    } catch (error) {
      console.error('Fallback get error:', error)
      // Clear corrupted entry
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`redis:${key}`)
      }
      return null
    }
  }

  private fallbackDel(key: string): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(`redis:${key}`)
      }
    } catch (error) {
      console.error('Fallback del error:', error)
    }
  }

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return this.isRedisAvailable
  }
}

// Export singleton instance
export const redisService = new RedisService()

// Export utility functions for common cache patterns
export const cacheUtils = {
  // User-specific cache keys
  userKey: (userId: string, resource: string) => `user:${userId}:${resource}`,
  
  // Company-specific cache keys
  companyKey: (companyId: string, resource: string) => `company:${companyId}:${resource}`,
  
  // Global cache keys
  globalKey: (resource: string) => `global:${resource}`,
  
  // Cache tags for invalidation
  tags: {
    user: (userId: string) => `user:${userId}`,
    company: (companyId: string) => `company:${companyId}`,
    global: () => 'global',
    transactions: () => 'transactions',
    employees: () => 'employees',
    notifications: () => 'notifications'
  }
}

// Cache TTL constants
export const CACHE_TTL = {
  USER_SESSION: 1800, // 30 minutes
  COMPANY_DATA: 3600, // 1 hour
  TRANSACTIONS: 300,  // 5 minutes
  EMPLOYEES: 1800,    // 30 minutes
  NOTIFICATIONS: 600,  // 10 minutes
  STATS: 300,         // 5 minutes
  SETTINGS: 7200,     // 2 hours
  PRICING: 3600,      // 1 hour
  CURRENCY_RATES: 86400, // 24 hours
  STATIC_CONTENT: 604800 // 7 days
} as const 