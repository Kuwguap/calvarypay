# Redis Implementation for CalvaryPay Frontend

## 🚀 Overview

This document describes the comprehensive Redis implementation using Upstash Redis for the CalvaryPay frontend application. The implementation provides intelligent caching, request deduplication, and performance optimization.

## 🔧 Configuration

### Environment Variables

Add the following to your `.env.local` file:

```bash
# Redis Configuration (Upstash)
NEXT_PUBLIC_UPSTASH_REDIS_REST_URL=https://apparent-gobbler-32856.upstash.io/
NEXT_PUBLIC_UPSTASH_REDIS_REST_TOKEN=AYBYAAIncDFkZDMzMDU2YTVmNzc0MmNmOTRlYzU0ODNkYWQ5ZmRkNnAxMzI4NTY

# Feature Flags
NEXT_PUBLIC_ENABLE_REDIS_CACHE=true
NEXT_PUBLIC_ENABLE_REQUEST_DEDUPLICATION=true
NEXT_PUBLIC_ENABLE_PREFETCHING=true
```

### Dependencies

```bash
npm install @upstash/redis
```

## 🏗️ Architecture

### 1. Redis Service (`/lib/services/redis.service.ts`)

Core Redis service providing:
- **Caching Operations**: Set, get, delete with TTL
- **Tag-based Invalidation**: Invalidate cache by patterns
- **Batch Operations**: Multiple operations in single request
- **Fallback Support**: localStorage fallback if Redis fails
- **Statistics**: Cache performance metrics

### 2. Redis Query Provider (`/lib/providers/redis-query-provider.tsx`)

Enhanced React Query provider with:
- **Redis Integration**: Custom cache adapter
- **Automatic Caching**: Cache successful responses
- **Tag Management**: Automatic tag extraction and invalidation
- **Cache Warming**: Pre-populate common data

### 3. Redis API Client (`/lib/api/redis-api.client.ts`)

Intelligent API client featuring:
- **Request Deduplication**: Prevent duplicate API calls
- **Smart Caching**: Cache GET requests automatically
- **Batch Requests**: Multiple API calls in single request
- **Cache Invalidation**: Automatic cache management

### 4. Redis Hooks (`/lib/hooks/use-redis-query.ts`)

Custom React hooks for:
- **Enhanced Queries**: Redis-backed useQuery
- **User Queries**: User-specific caching
- **Company Queries**: Company-specific caching
- **Global Queries**: Application-wide caching
- **Mutations**: Cache-aware mutations

## 📊 Cache TTL Strategy

| Data Type | TTL | Description |
|-----------|-----|-------------|
| User Session | 30 minutes | User-specific data |
| Company Data | 1 hour | Company information |
| Transactions | 5 minutes | Recent transaction data |
| Employees | 30 minutes | Employee lists and details |
| Notifications | 10 minutes | User notifications |
| Stats | 5 minutes | Dashboard statistics |
| Settings | 2 hours | Application settings |
| Pricing | 1 hour | Pricing information |
| Currency Rates | 24 hours | Exchange rates |
| Static Content | 7 days | Application configuration |

## 🎯 Usage Examples

### Basic Redis Query

```typescript
import { useUserQuery } from '@/lib/hooks/use-redis-query'

function UserProfile({ userId }: { userId: string }) {
  const { data, isLoading, isFromCache } = useUserQuery(
    userId,
    'profile',
    async () => {
      const response = await fetch(`/api/users/${userId}/profile`)
      return response.json()
    },
    {
      ttl: 1800, // 30 minutes
      tags: ['profile', 'user']
    }
  )

  return (
    <div>
      {isFromCache && <Badge>Cached</Badge>}
      {/* Your component */}
    </div>
  )
}
```

### Company Data with Cache Invalidation

```typescript
import { useCompanyQuery, useRedisMutation } from '@/lib/hooks/use-redis-query'

function CompanySettings({ companyId }: { companyId: string }) {
  const { data: settings } = useCompanyQuery(
    companyId,
    'settings',
    async () => {
      const response = await fetch(`/api/companies/${companyId}/settings`)
      return response.json()
    }
  )

  const updateSettings = useRedisMutation(
    async (newSettings: any) => {
      const response = await fetch(`/api/companies/${companyId}/settings`, {
        method: 'PATCH',
        body: JSON.stringify(newSettings)
      })
      return response.json()
    },
    {
      invalidateTags: ['company', 'settings'],
      onSuccess: () => {
        // Settings updated successfully
      }
    }
  )

  return (
    <div>
      {/* Your component */}
    </div>
  )
}
```

### Batch API Requests

```typescript
import { apiUtils } from '@/lib/api/redis-api.client'

async function loadDashboardData(userId: string, companyId: string, token: string) {
  const results = await apiUtils.batch({
    user: {
      key: 'user-profile',
      endpoint: `/api/users/${userId}/profile`,
      cache: { ttl: 1800, tags: ['user'] }
    },
    company: {
      key: 'company-info',
      endpoint: `/api/companies/${companyId}`,
      cache: { ttl: 3600, tags: ['company'] }
    },
    transactions: {
      key: 'recent-transactions',
      endpoint: `/api/transactions/recent`,
      cache: { ttl: 300, tags: ['transactions'] }
    }
  })

  return results
}
```

## 🔄 Cache Invalidation

### Automatic Invalidation

```typescript
// Invalidate by tags
await cacheInvalidation.transactions()
await cacheInvalidation.employees()
await cacheInvalidation.notifications()

// Invalidate user-specific caches
await cacheInvalidation.user(userId)

// Invalidate company-specific caches
await cacheInvalidation.company(companyId)

// Invalidate multiple resources
await cacheInvalidation.multiple(['transactions', 'employees'])
```

### Manual Invalidation

```typescript
import { redisService } from '@/lib/services/redis.service'

// Invalidate specific key
await redisService.del('user:123:profile')

// Invalidate by pattern
await redisService.invalidateByTags(['user:123:*'])

// Clear all cache
await redisService.clearAll()
```

## 📈 Performance Benefits

### 1. **Faster Loading States**
- Data loads from cache in < 10ms vs API calls (200ms+)
- Instant display of previously fetched data
- Reduced loading spinners and skeleton states

### 2. **Request Deduplication**
- Prevents duplicate API calls during rapid navigation
- Reduces server load and improves user experience
- Automatic request queuing and result sharing

### 3. **Intelligent Prefetching**
- Pre-loads data before user needs it
- Background cache warming for common data
- Reduced perceived loading times

### 4. **Offline Resilience**
- localStorage fallback when Redis is unavailable
- Graceful degradation without breaking functionality
- Automatic sync when Redis becomes available

## 🛠️ Cache Management

### Admin Dashboard Integration

```typescript
import { CacheManagement } from '@/components/cache-management'

function AdminDashboard() {
  return (
    <div>
      <h1>Admin Dashboard</h1>
      <CacheManagement />
    </div>
  )
}
```

### Cache Statistics

```typescript
import { useCacheStats } from '@/lib/hooks/use-redis-query'

function CacheStats() {
  const { stats, isLoading, refreshStats } = useCacheStats()
  
  return (
    <div>
      <h3>Cache Statistics</h3>
      <p>Total Keys: {stats.totalKeys}</p>
      <p>Hit Rate: {stats.hitRate}%</p>
      <button onClick={refreshStats}>Refresh</button>
    </div>
  )
}
```

## 🔍 Monitoring and Debugging

### Development Tools

1. **React Query Devtools**: Built-in query monitoring
2. **Cache Status Indicators**: Visual cache hit indicators
3. **Console Logging**: Detailed cache operations logging
4. **Performance Metrics**: Cache hit rates and response times

### Production Monitoring

1. **Cache Statistics**: Real-time cache performance metrics
2. **Error Tracking**: Redis connection and operation errors
3. **Performance Alerts**: Cache miss rate thresholds
4. **Health Checks**: Redis service availability

## 🚨 Error Handling

### Fallback Strategies

1. **Redis Unavailable**: Automatic localStorage fallback
2. **Cache Miss**: Graceful API fallback
3. **Invalidation Errors**: Continue without cache invalidation
4. **Connection Timeouts**: Retry with exponential backoff

### Error Recovery

```typescript
try {
  await redisService.set(key, value, options)
} catch (error) {
  console.error('Redis operation failed:', error)
  // Fallback to localStorage or continue without caching
  fallbackSet(key, value, options)
}
```

## 🔒 Security Considerations

### Data Privacy

1. **User Isolation**: Cache keys are user-specific
2. **Company Isolation**: Company data is company-specific
3. **TTL Enforcement**: Automatic data expiration
4. **No Sensitive Data**: Only cache non-sensitive information

### Access Control

1. **Token Validation**: All API calls require valid tokens
2. **Role-based Access**: Cache access follows user permissions
3. **Audit Logging**: Cache operations are logged
4. **Rate Limiting**: Prevent cache abuse

## 📱 Mobile and PWA Support

### Offline Capabilities

1. **localStorage Fallback**: Works offline
2. **Cache Persistence**: Survives app restarts
3. **Background Sync**: Syncs when online
4. **Progressive Enhancement**: Graceful degradation

### Performance Optimization

1. **Lazy Loading**: Load data on demand
2. **Background Prefetching**: Pre-load likely data
3. **Smart Invalidation**: Only invalidate changed data
4. **Memory Management**: Automatic cache cleanup

## 🚀 Future Enhancements

### Planned Features

1. **Distributed Caching**: Multi-region Redis clusters
2. **Advanced Analytics**: Detailed cache performance insights
3. **Machine Learning**: Predictive cache warming
4. **Real-time Updates**: WebSocket cache invalidation
5. **Edge Caching**: CDN integration for global performance

### Scalability Considerations

1. **Horizontal Scaling**: Multiple Redis instances
2. **Load Balancing**: Distribute cache load
3. **Data Partitioning**: Shard cache by user/company
4. **Backup Strategies**: Cache data replication

## 📚 Additional Resources

- [Upstash Redis Documentation](https://docs.upstash.com/redis)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Next.js Caching Strategies](https://nextjs.org/docs/app/building-your-application/caching)
- [Redis Best Practices](https://redis.io/topics/best-practices)

## 🤝 Contributing

When adding new cached data:

1. **Choose Appropriate TTL**: Based on data volatility
2. **Add Cache Tags**: For proper invalidation
3. **Implement Fallbacks**: Handle cache failures gracefully
4. **Add Monitoring**: Track cache performance
5. **Update Documentation**: Keep this guide current

---

**Note**: This implementation provides a robust foundation for high-performance caching in the CalvaryPay frontend. Regular monitoring and optimization will ensure optimal performance as the application scales. 