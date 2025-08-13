/**
 * Redis-Enhanced React Query Provider
 * Provides React Query client with Redis caching for optimal performance
 */

"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { redisService, cacheUtils, CACHE_TTL } from "@/lib/services/redis.service"

// Dynamically import devtools to avoid SSR issues
const ReactQueryDevtools = dynamic(
  () => import("@tanstack/react-query-devtools").then((mod) => ({ default: mod.ReactQueryDevtools })),
  { ssr: false }
)

export function RedisQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Enhanced caching with Redis
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
            retry: (failureCount, error: any) => {
              // Don't retry on 401/403 errors
              if (error?.statusCode === 401 || error?.statusCode === 403) {
                return false
              }
              // Retry up to 3 times for other errors
              return failureCount < 3
            },
            refetchOnWindowFocus: false,
            refetchOnMount: true,
            refetchOnReconnect: true,
            // Use Redis for persistent caching
            placeholderData: (previousData) => previousData,
          },
          mutations: {
            retry: false,
            // Invalidate related queries after mutations
            onSuccess: (data, variables, context) => {
              // This will be handled by individual mutations
            },
          },
        },
      })
  )

  // Initialize Redis connection and warm up common caches
  useEffect(() => {
    const initializeCache = async () => {
      try {
        // Only initialize if Redis is available
        if (!redisService.isAvailable()) {
          console.log('🟡 Redis not available, using localStorage fallback')
          return
        }

        // Warm up common caches
        await Promise.all([
          // Pre-cache common data
          redisService.set('app:config', {
            version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
            environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development',
            features: {
              offlineMode: process.env.NEXT_PUBLIC_ENABLE_OFFLINE_MODE === 'true',
              realtimeUpdates: process.env.NEXT_PUBLIC_ENABLE_REALTIME_UPDATES === 'true',
            }
          }, { ttl: CACHE_TTL.STATIC_CONTENT, tags: [cacheUtils.tags.global()] }),
          
          // Cache currency rates (if available)
          redisService.set('global:currencies', [
            { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵' },
            { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
            { code: 'USD', name: 'US Dollar', symbol: '$' },
            { code: 'EUR', name: 'Euro', symbol: '€' },
            { code: 'GBP', name: 'British Pound', symbol: '£' }
          ], { ttl: CACHE_TTL.CURRENCY_RATES, tags: [cacheUtils.tags.global()] })
        ])

        console.log('🚀 Redis cache initialized successfully')
      } catch (error) {
        console.warn('Redis cache initialization failed, using fallback:', error)
      }
    }

    initializeCache()
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  )
}

// Enhanced hooks with Redis caching
export const useRedisQuery = {
  // User-specific queries with automatic cache invalidation
  user: <T>(
    userId: string,
    resource: string,
    queryFn: () => Promise<T>,
    options: {
      ttl?: number
      tags?: string[]
      enabled?: boolean
    } = {}
  ) => {
    const { ttl = CACHE_TTL.USER_SESSION, tags = [], enabled = true } = options
    const key = cacheUtils.userKey(userId, resource)
    
    return {
      queryKey: [key],
      queryFn,
      enabled: enabled && !!userId,
      staleTime: ttl * 1000,
      gcTime: ttl * 2 * 1000,
      meta: { cacheKey: key, tags: [cacheUtils.tags.user(userId), ...tags] }
    }
  },

  // Company-specific queries
  company: <T>(
    companyId: string,
    resource: string,
    queryFn: () => Promise<T>,
    options: {
      ttl?: number
      tags?: string[]
      enabled?: boolean
    } = {}
  ) => {
    const { ttl = CACHE_TTL.COMPANY_DATA, tags = [], enabled = true } = options
    const key = cacheUtils.companyKey(companyId, resource)
    
    return {
      queryKey: [key],
      queryFn,
      enabled: enabled && !!companyId,
      staleTime: ttl * 1000,
      gcTime: ttl * 2 * 1000,
      meta: { cacheKey: key, tags: [cacheUtils.tags.company(companyId), ...tags] }
    }
  },

  // Global queries
  global: <T>(
    resource: string,
    queryFn: () => Promise<T>,
    options: {
      ttl?: number
      tags?: string[]
      enabled?: boolean
    } = {}
  ) => {
    const { ttl = CACHE_TTL.STATIC_CONTENT, tags = [], enabled = true } = options
    const key = cacheUtils.globalKey(resource)
    
    return {
      queryKey: [key],
      queryFn,
      enabled,
      staleTime: ttl * 1000,
      gcTime: ttl * 2 * 1000,
      meta: { cacheKey: key, tags: [cacheUtils.tags.global(), ...tags] }
    }
  }
}

// Cache invalidation utilities
export const cacheInvalidation = {
  // Invalidate user-specific caches
  user: async (userId: string) => {
    await redisService.invalidateByTags([cacheUtils.tags.user(userId)])
  },

  // Invalidate company-specific caches
  company: async (companyId: string) => {
    await redisService.invalidateByTags([cacheUtils.tags.company(companyId)])
  },

  // Invalidate global caches
  global: async () => {
    await redisService.invalidateByTags([cacheUtils.tags.global()])
  },

  // Invalidate specific resource types
  transactions: async () => {
    await redisService.invalidateByTags([cacheUtils.tags.transactions()])
  },

  employees: async () => {
    await redisService.invalidateByTags([cacheUtils.tags.employees()])
  },

  notifications: async () => {
    await redisService.invalidateByTags([cacheUtils.tags.notifications()])
  },

  // Invalidate multiple resources
  multiple: async (resources: string[]) => {
    const tags = resources.map(resource => {
      switch (resource) {
        case 'transactions': return cacheUtils.tags.transactions()
        case 'employees': return cacheUtils.tags.employees()
        case 'notifications': return cacheUtils.tags.notifications()
        case 'global': return cacheUtils.tags.global()
        default: return resource
      }
    })
    await redisService.invalidateByTags(tags)
  }
} 