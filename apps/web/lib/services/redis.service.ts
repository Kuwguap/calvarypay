/**
 * Upstash Redis Service for CalvaryPay Frontend
 * Provides caching, session management, and performance optimization
 */

import { Redis } from '@upstash/redis'

// Check if Redis credentials are available
const REDIS_URL = process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_URL
const REDIS_TOKEN = process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_TOKEN

// Initialize Redis client with error handling
let redis: Redis | null = null

// Only initialize Redis on the client side
if (typeof window !== 'undefined' && REDIS_URL && REDIS_TOKEN) {
  try {
    redis = new Redis({
      url: REDIS_URL,
      token: REDIS_TOKEN,
    })
  } catch (error) {
    console.warn('Redis initialization failed, falling back to localStorage:', error)
  }
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
    this.isRedisAvailable = !!redis && typeof window !== 'undefined'
  }

  /**
   * Check if Redis is available
   */
  isAvailable(): boolean {
    return this.isRedisAvailable
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
          console.error('Failed to parse cached data:', parseError)
          return null
        }
      } else {
        // Fallback to localStorage
        return this.fallbackGet(key)
      }
    } catch (error) {
      console.error('Redis get error:', error)
      // Fallback to localStorage if Redis fails
      return this.fallbackGet(key)
    }
  }

  /**
   * Delete a value from cache
   */
  async del(key: string): Promise<void> {
    try {
      if (this.isRedisAvailable && this.redis) {
        await this.redis.del(key)
        // Also remove tags
        await this.redis.del(`tags:${key}`)
      } else {
        // Fallback to localStorage
        this.fallbackDel(key)
      }
    } catch (error) {
      console.error('Redis del error:', error)
      // Fallback to localStorage if Redis fails
      this.fallbackDel(key)
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    try {
      if (this.isRedisAvailable && this.redis) {
        // Get all keys with matching tags
        const keysToDelete: string[] = []
        
        for (const tag of tags) {
          const tagKeys = await this.redis.smembers(`tag:${tag}`)
          keysToDelete.push(...tagKeys)
        }

        // Delete all keys and their tags
        if (keysToDelete.length > 0) {
          await Promise.all([
            this.redis.del(...keysToDelete),
            ...keysToDelete.map(key => this.redis.del(`tags:${key}`))
          ])
        }
      }
    } catch (error) {
      console.error('Redis invalidateByTags error:', error)
    }
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    try {
      if (this.isRedisAvailable && this.redis) {
        // This is a destructive operation - use with caution
        await this.redis.flushdb()
      } else {
        // Fallback to localStorage
        this.fallbackClear()
      }
    } catch (error) {
      console.error('Redis clear error:', error)
      // Fallback to localStorage if Redis fails
      this.fallbackClear()
    }
  }

  // Fallback methods using localStorage
  private fallbackSet<T>(key: string, value: T, options: CacheOptions = {}): void {
    try {
      const { ttl = 3600 } = options
      const entry: CacheEntry<T> = {
        data: value,
        timestamp: Date.now(),
        ttl
      }
      localStorage.setItem(key, JSON.stringify(entry))
    } catch (error) {
      console.error('localStorage set error:', error)
    }
  }

  private fallbackGet<T>(key: string): T | null {
    try {
      const cached = localStorage.getItem(key)
      if (!cached) return null

      const entry: CacheEntry<T> = JSON.parse(cached)
      
      // Check if expired
      if (Date.now() - entry.timestamp > entry.ttl * 1000) {
        localStorage.removeItem(key)
        return null
      }

      return entry.data
    } catch (error) {
      console.error('localStorage get error:', error)
      return null
    }
  }

  private fallbackDel(key: string): void {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error('localStorage del error:', error)
    }
  }

  private fallbackClear(): void {
    try {
      localStorage.clear()
    } catch (error) {
      console.error('localStorage clear error:', error)
    }
  }
}

// Export singleton instance
export const redisService = new RedisService()

// Export cache utilities
export const cacheUtils = {
  tags: {
    global: () => 'global',
    user: (userId: string) => `user:${userId}`,
    company: (companyId: string) => `company:${companyId}`,
    transaction: (transactionId: string) => `transaction:${transactionId}`,
    balance: (userId: string) => `balance:${userId}`,
    notifications: (userId: string) => `notifications:${userId}`,
    analytics: (companyId: string) => `analytics:${companyId}`,
  }
}

// Cache TTL constants
export const CACHE_TTL = {
  SHORT: 300, // 5 minutes
  MEDIUM: 1800, // 30 minutes
  LONG: 3600, // 1 hour
  STATIC_CONTENT: 86400, // 24 hours
  CURRENCY_RATES: 3600, // 1 hour
  USER_PROFILE: 1800, // 30 minutes
  COMPANY_DATA: 1800, // 30 minutes
  TRANSACTIONS: 300, // 5 minutes
  BALANCES: 60, // 1 minute
  NOTIFICATIONS: 300, // 5 minutes
  ANALYTICS: 1800, // 30 minutes
} as const 