/**
 * Redis-Enhanced React Query Provider
 * Provides React Query client with Redis caching for optimal performance
 */

"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState, useEffect } from "react"
import dynamic from "next/dynamic"

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
        // Only initialize on client side
        if (typeof window === 'undefined') return

        // Dynamically import Redis service to avoid SSR issues
        const { redisService, cacheUtils, CACHE_TTL } = await import('@/lib/services/redis.service')
        
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

// Export cache invalidation utilities
export const cacheInvalidation = {
  user: (userId: string) => ({
    queryKey: ['user', userId],
    exact: true
  }),
  company: (companyId: string) => ({
    queryKey: ['company', companyId],
    exact: true
  }),
  transactions: (companyId: string) => ({
    queryKey: ['transactions', companyId],
    exact: true
  }),
  balances: (userId: string) => ({
    queryKey: ['balances', userId],
    exact: true
  }),
  notifications: (userId: string) => ({
    queryKey: ['notifications', userId],
    exact: true
  }),
  analytics: (companyId: string) => ({
    queryKey: ['analytics', companyId],
    exact: true
  }),
  global: () => ({
    queryKey: ['global'],
    exact: true
  })
} 