/**
 * Redis-Enhanced React Query Hooks
 * Provides intelligent caching, prefetching, and performance optimization
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query'
import { redisService, cacheUtils, CACHE_TTL } from '@/lib/services/redis.service'
import { apiUtils } from '@/lib/api/redis-api.client'
import { useState, useEffect, useCallback } from 'react'

// Enhanced useQuery with Redis caching
export function useRedisQuery<TData, TError = unknown>(
  queryKey: string[],
  queryFn: () => Promise<TData>,
  options: {
    ttl?: number
    tags?: string[]
    enabled?: boolean
    staleTime?: number
    gcTime?: number
    placeholderData?: TData
    refetchOnWindowFocus?: boolean
    refetchOnMount?: boolean
    refetchOnReconnect?: boolean
  } = {}
) {
  const {
    ttl = CACHE_TTL.STATS,
    tags = [],
    enabled = true,
    staleTime = ttl * 1000,
    gcTime = ttl * 2 * 1000,
    placeholderData,
    refetchOnWindowFocus = false,
    refetchOnMount = true,
    refetchOnReconnect = true,
    ...restOptions
  } = options

  // Generate cache key from query key
  const cacheKey = queryKey.join(':')
  
  // Check Redis cache first
  const [cachedData, setCachedData] = useState<TData | null>(null)
  const [isLoadingCache, setIsLoadingCache] = useState(true)

  useEffect(() => {
    const loadFromCache = async () => {
      try {
        const cached = await redisService.get<TData>(cacheKey)
        if (cached) {
          setCachedData(cached)
        }
      } catch (error) {
        console.error('Redis cache load error:', error)
      } finally {
        setIsLoadingCache(false)
      }
    }

    if (enabled) {
      loadFromCache()
    }
  }, [cacheKey, enabled])

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      // Try to get from cache first
      const cached = await redisService.get<TData>(cacheKey)
      if (cached) {
        return cached
      }

      // Fetch from API if not cached
      const data = await queryFn()
      
      // Cache the result
      await redisService.set(cacheKey, data, {
        ttl,
        tags
      })

      return data
    },
    enabled: enabled && !isLoadingCache,
    staleTime,
    gcTime,
    placeholderData: cachedData || placeholderData,
    refetchOnWindowFocus,
    refetchOnMount,
    refetchOnReconnect,
    ...restOptions
  })

  // Enhanced return with cache information
  return {
    ...query,
    cachedData,
    isLoadingCache,
    isFromCache: !!cachedData && !query.isLoading,
    // Cache management functions
    invalidateCache: async () => {
      await redisService.del(cacheKey)
      query.refetch()
    },
    updateCache: async (updater: (oldData: TData | undefined) => TData) => {
      const newData = updater(query.data)
      await redisService.set(cacheKey, newData, { ttl, tags })
      query.setData(newData)
    }
  }
}

// User-specific queries with automatic cache invalidation
export function useUserQuery<TData, TError = unknown>(
  userId: string,
  resource: string,
  queryFn: () => Promise<TData>,
  options: {
    ttl?: number
    tags?: string[]
    enabled?: boolean
  } = {}
) {
  const { ttl = CACHE_TTL.USER_SESSION, tags = [], enabled = true } = options
  const cacheKey = cacheUtils.userKey(userId, resource)
  
  return useRedisQuery<TData, TError>(
    [cacheKey],
    queryFn,
    {
      ttl,
      tags: [cacheUtils.tags.user(userId), ...tags],
      enabled: enabled && !!userId
    }
  )
}

// Company-specific queries with automatic cache invalidation
export function useCompanyQuery<TData, TError = unknown>(
  companyId: string,
  resource: string,
  queryFn: () => Promise<TData>,
  options: {
    ttl?: number
    tags?: string[]
    enabled?: boolean
  } = {}
) {
  const { ttl = CACHE_TTL.COMPANY_DATA, tags = [], enabled = true } = options
  const cacheKey = cacheUtils.companyKey(companyId, resource)
  
  return useRedisQuery<TData, TError>(
    [cacheKey],
    queryFn,
    {
      ttl,
      tags: [cacheUtils.tags.company(companyId), ...tags],
      enabled: enabled && !!companyId
    }
  )
}

// Global queries with static content caching
export function useGlobalQuery<TData, TError = unknown>(
  resource: string,
  queryFn: () => Promise<TData>,
  options: {
    ttl?: number
    tags?: string[]
    enabled?: boolean
  } = {}
) {
  const { ttl = CACHE_TTL.STATIC_CONTENT, tags = [], enabled = true } = options
  const cacheKey = cacheUtils.globalKey(resource)
  
  return useRedisQuery<TData, TError>(
    [cacheKey],
    queryFn,
    {
      ttl,
      tags: [cacheUtils.tags.global(), ...tags],
      enabled
    }
  )
}

// Enhanced useMutation with cache invalidation
export function useRedisMutation<TData, TError, TVariables>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    onSuccess?: (data: TData, variables: TVariables, context: any) => void
    onError?: (error: TError, variables: TVariables, context: any) => void
    invalidateQueries?: string[]
    invalidateTags?: string[]
    updateCache?: (key: string, updater: (oldData: any) => any) => void
  } = {}
) {
  const queryClient = useQueryClient()
  const {
    onSuccess,
    onError,
    invalidateQueries = [],
    invalidateTags = [],
    updateCache,
    ...restOptions
  } = options

  const mutation = useMutation({
    mutationFn,
    onSuccess: async (data, variables, context) => {
      // Invalidate related queries
      if (invalidateQueries.length > 0) {
        await Promise.all(
          invalidateQueries.map(queryKey => 
            queryClient.invalidateQueries({ queryKey: [queryKey] })
          )
        )
      }

      // Invalidate cache tags
      if (invalidateTags.length > 0) {
        await redisService.invalidateByTags(invalidateTags)
      }

      // Call original onSuccess
      if (onSuccess) {
        onSuccess(data, variables, context)
      }
    },
    onError: (error, variables, context) => {
      if (onError) {
        onError(error, variables, context)
      }
    },
    ...restOptions
  })

  return {
    ...mutation,
    // Cache management functions
    invalidateCache: async (tags: string[]) => {
      await redisService.invalidateByTags(tags)
    },
    updateCache: async (key: string, updater: (oldData: any) => any) => {
      const oldData = await redisService.get(key)
      if (oldData) {
        const newData = updater(oldData)
        await redisService.set(key, newData)
      }
    }
  }
}

// Prefetching hook for better UX
export function usePrefetch<TData>(
  queryKey: string[],
  queryFn: () => Promise<TData>,
  options: {
    ttl?: number
    tags?: string[]
  } = {}
) {
  const { ttl = CACHE_TTL.STATS, tags = [] } = options
  const cacheKey = queryKey.join(':')

  const prefetch = useCallback(async () => {
    try {
      // Check if already cached
      const cached = await redisService.get<TData>(cacheKey)
      if (cached) {
        return cached
      }

      // Prefetch and cache
      const data = await queryFn()
      await redisService.set(cacheKey, data, { ttl, tags })
      
      console.log(`✅ Prefetched: ${cacheKey}`)
      return data
    } catch (error) {
      console.error(`❌ Prefetch failed: ${cacheKey}`, error)
      return null
    }
  }, [cacheKey, queryFn, ttl, tags])

  return { prefetch }
}

// Batch queries hook for multiple related data
export function useBatchQueries<T extends Record<string, any>>(
  queries: Array<{
    key: string
    queryFn: () => Promise<any>
    ttl?: number
    tags?: string[]
  }>,
  options: {
    enabled?: boolean
  } = {}
) {
  const { enabled = true } = options
  
  const batchQuery = useCallback(async () => {
    if (!enabled) return {}

    try {
      const results: T = {} as T
      
      // Try to get all from cache first
      const cacheKeys = queries.map(q => q.key)
      const cachedResults = await redisService.mget<any>(cacheKeys)
      
      const uncachedQueries = queries.filter((_, index) => !cachedResults[index])
      
      // Fetch uncached queries
      if (uncachedQueries.length > 0) {
        const fetchPromises = uncachedQueries.map(async (query, index) => {
          const originalIndex = queries.findIndex(q => q.key === query.key)
          const data = await query.queryFn()
          
          // Cache the result
          await redisService.set(query.key, data, {
            ttl: query.ttl || CACHE_TTL.STATS,
            tags: query.tags || []
          })
          
          return { key: query.key, data, originalIndex }
        })

        const fetchedResults = await Promise.all(fetchPromises)
        
        // Merge fetched results
        fetchedResults.forEach(({ key, data, originalIndex }) => {
          results[key] = data
          cachedResults[originalIndex] = data
        })
      }

      // Merge cached results
      queries.forEach((query, index) => {
        if (cachedResults[index]) {
          results[query.key] = cachedResults[index]
        }
      })

      return results
    } catch (error) {
      console.error('Batch queries failed:', error)
      return {} as T
    }
  }, [queries, enabled])

  return { batchQuery }
}

// Cache statistics hook
export function useCacheStats() {
  const [stats, setStats] = useState({
    totalKeys: 0,
    memoryUsage: 'N/A',
    hitRate: 0
  })
  const [isLoading, setIsLoading] = useState(false)

  const refreshStats = useCallback(async () => {
    setIsLoading(true)
    try {
      const newStats = await redisService.getStats()
      setStats(newStats)
    } catch (error) {
      console.error('Failed to get cache stats:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshStats()
  }, [refreshStats])

  return { stats, isLoading, refreshStats }
}

// Export utility functions
export { redisService, cacheUtils, CACHE_TTL } 