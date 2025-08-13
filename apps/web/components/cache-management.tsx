/**
 * Redis Cache Management Component
 * Provides cache statistics and management tools for administrators
 */

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Database, 
  Trash2, 
  RefreshCw, 
  TrendingUp, 
  Clock, 
  Zap,
  AlertTriangle,
  CheckCircle
} from "lucide-react"
import { redisService, cacheUtils, CACHE_TTL } from "@/lib/services/redis.service"

interface CacheStats {
  totalKeys: number
  memoryUsage: string
  hitRate: number
}

interface CacheKey {
  key: string
  ttl: number
  size: number
  lastAccessed: number
}

export function CacheManagement() {
  const [stats, setStats] = useState<CacheStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [cacheKeys, setCacheKeys] = useState<CacheKey[]>([])
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [operationStatus, setOperationStatus] = useState<{
    type: 'success' | 'error' | 'info'
    message: string
  } | null>(null)

  // Load cache statistics
  const loadStats = async () => {
    try {
      const cacheStats = await redisService.getStats()
      setStats(cacheStats)
    } catch (error) {
      console.error('Failed to load cache stats:', error)
      setOperationStatus({
        type: 'error',
        message: 'Failed to load cache statistics'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Refresh cache statistics
  const refreshStats = async () => {
    setIsRefreshing(true)
    try {
      await loadStats()
      setOperationStatus({
        type: 'success',
        message: 'Cache statistics refreshed successfully'
      })
    } catch (error) {
      setOperationStatus({
        type: 'error',
        message: 'Failed to refresh cache statistics'
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  // Clear all cache
  const clearAllCache = async () => {
    if (!confirm('Are you sure you want to clear all cache? This action cannot be undone.')) {
      return
    }

    try {
      await redisService.clearAll()
      setOperationStatus({
        type: 'success',
        message: 'All cache cleared successfully'
      })
      await loadStats()
    } catch (error) {
      setOperationStatus({
        type: 'error',
        message: 'Failed to clear cache'
      })
    }
  }

  // Clear selected cache keys
  const clearSelectedKeys = async () => {
    if (selectedKeys.length === 0) return

    try {
      await Promise.all(selectedKeys.map(key => redisService.del(key)))
      setOperationStatus({
        type: 'success',
        message: `Cleared ${selectedKeys.length} cache keys successfully`
      })
      setSelectedKeys([])
      await loadStats()
    } catch (error) {
      setOperationStatus({
        type: 'error',
        message: 'Failed to clear selected cache keys'
      })
    }
  }

  // Invalidate cache by tags
  const invalidateByTags = async (tags: string[]) => {
    try {
      await redisService.invalidateByTags(tags)
      setOperationStatus({
        type: 'success',
        message: `Invalidated cache for tags: ${tags.join(', ')}`
      })
      await loadStats()
    } catch (error) {
      setOperationStatus({
        type: 'error',
        message: 'Failed to invalidate cache by tags'
      })
    }
  }

  // Warm up common caches
  const warmUpCache = async () => {
    try {
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
        
        // Cache currency rates
        redisService.set('global:currencies', [
          { code: 'GHS', name: 'Ghanaian Cedi', symbol: '₵' },
          { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
          { code: 'USD', name: 'US Dollar', symbol: '$' },
          { code: 'EUR', name: 'Euro', symbol: '€' },
          { code: 'GBP', name: 'British Pound', symbol: '£' }
        ], { ttl: CACHE_TTL.CURRENCY_RATES, tags: [cacheUtils.tags.global()] })
      ])

      setOperationStatus({
        type: 'success',
        message: 'Cache warmed up successfully'
      })
      await loadStats()
    } catch (error) {
      setOperationStatus({
        type: 'error',
        message: 'Failed to warm up cache'
      })
    }
  }

  useEffect(() => {
    loadStats()
  }, [])

  // Clear operation status after 5 seconds
  useEffect(() => {
    if (operationStatus) {
      const timer = setTimeout(() => setOperationStatus(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [operationStatus])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Operation Status */}
      {operationStatus && (
        <div className={`p-4 rounded-lg border ${
          operationStatus.type === 'success' 
            ? 'bg-green-500/20 border-green-500/30 text-green-400'
            : operationStatus.type === 'error'
            ? 'bg-red-500/20 border-red-500/30 text-red-400'
            : 'bg-blue-500/20 border-blue-500/30 text-blue-400'
        }`}>
          <div className="flex items-center space-x-2">
            {operationStatus.type === 'success' && <CheckCircle className="w-4 h-4" />}
            {operationStatus.type === 'error' && <AlertTriangle className="w-4 h-4" />}
            <span>{operationStatus.message}</span>
          </div>
        </div>
      )}

      {/* Cache Statistics */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white text-lg font-semibold flex items-center">
                <Database className="w-5 h-5 mr-2 text-blue-400" />
                Cache Statistics
              </CardTitle>
              <CardDescription className="text-slate-400">
                Redis cache performance and usage metrics
              </CardDescription>
            </div>
            <Button
              onClick={refreshStats}
              disabled={isRefreshing}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Keys */}
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Total Keys</span>
                <Database className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-2xl font-bold text-white">{stats?.totalKeys || 0}</div>
              <div className="text-xs text-slate-400 mt-1">Cached items</div>
            </div>

            {/* Hit Rate */}
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Hit Rate</span>
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-white">
                {stats?.hitRate ? Math.round(stats.hitRate * 100) : 0}%
              </div>
              <Progress value={stats?.hitRate ? stats.hitRate * 100 : 0} className="mt-2" />
              <div className="text-xs text-slate-400 mt-1">Cache efficiency</div>
            </div>

            {/* Memory Usage */}
            <div className="p-4 bg-slate-800/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-400 text-sm">Memory Usage</span>
                <Zap className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-white">{stats?.memoryUsage || 'N/A'}</div>
              <div className="text-xs text-slate-400 mt-1">Storage utilization</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cache Management Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-white text-lg font-semibold">Cache Management</CardTitle>
          <CardDescription className="text-slate-400">
            Manage cache operations and performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Warm Up Cache */}
            <Button
              onClick={warmUpCache}
              variant="outline"
              className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
            >
              <Zap className="w-4 h-4 mr-2" />
              Warm Up
            </Button>

            {/* Clear All Cache */}
            <Button
              onClick={clearAllCache}
              variant="outline"
              className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </Button>

            {/* Invalidate User Caches */}
            <Button
              onClick={() => invalidateByTags(['user:*'])}
              variant="outline"
              className="border-amber-600 text-amber-400 hover:bg-amber-600 hover:text-white"
            >
              <Clock className="w-4 h-4 mr-2" />
              Clear Users
            </Button>

            {/* Invalidate Company Caches */}
            <Button
              onClick={() => invalidateByTags(['company:*'])}
              variant="outline"
              className="border-purple-600 text-purple-400 hover:bg-purple-600 hover:text-white"
            >
              <Database className="w-4 h-4 mr-2" />
              Clear Companies
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cache TTL Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-white text-lg font-semibold">Cache TTL Settings</CardTitle>
          <CardDescription className="text-slate-400">
            Time-to-live settings for different data types
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(CACHE_TTL).map(([key, value]) => (
              <div key={key} className="p-3 bg-slate-800/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 text-sm font-medium">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                  <Badge variant="outline" className="border-slate-600 text-slate-300">
                    {value}s
                  </Badge>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {value >= 3600 ? `${Math.round(value / 3600)}h` : 
                   value >= 60 ? `${Math.round(value / 60)}m` : `${value}s`}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cache Key Patterns */}
      <Card>
        <CardHeader>
          <CardTitle className="text-white text-lg font-semibold">Cache Key Patterns</CardTitle>
          <CardDescription className="text-slate-400">
            Standard cache key patterns used throughout the application
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-mono text-sm">user:{'{userId}'}:{'{resource}'}</span>
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">User Data</Badge>
              </div>
              <div className="text-xs text-slate-500 mt-1">User-specific cached data</div>
            </div>
            
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-mono text-sm">company:{'{companyId}'}:{'{resource}'}</span>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Company Data</Badge>
              </div>
              <div className="text-xs text-slate-500 mt-1">Company-specific cached data</div>
            </div>
            
            <div className="p-3 bg-slate-800/50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-mono text-sm">global:{'{resource}'}</span>
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Global Data</Badge>
              </div>
              <div className="text-xs text-slate-500 mt-1">Application-wide cached data</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 