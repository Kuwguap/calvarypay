# CalvaryPay Performance Rules and Standards

## Database Performance Rules

### Rule P1.1: Query Optimization
- **Index Usage**: Every query must use appropriate indexes
- **Query Complexity**: Avoid N+1 queries, use joins or batch operations
- **Connection Pooling**: Use connection pools with max 20 connections per service
- **Query Timeout**: Set 30-second timeout for all database queries
- **Prepared Statements**: Use prepared statements for repeated queries

### Rule P1.2: Database Design for Performance
- **Denormalization**: Acceptable for read-heavy tables (audit logs, reports)
- **Partitioning**: Partition large tables by date (audit_logs, transactions)
- **Archiving**: Move old data to archive tables after 2 years
- **Vacuum Strategy**: Regular VACUUM and ANALYZE on PostgreSQL

### Rule P1.3: Caching Strategy
- **Redis TTL**: Set appropriate TTL for all cached data
  - User sessions: 30 minutes
  - Price data: 1 hour
  - Currency rates: 24 hours
  - Static content: 7 days
- **Cache Invalidation**: Implement cache invalidation on data updates
- **Cache Warming**: Pre-populate cache for frequently accessed data

## API Performance Rules

### Rule P2.1: Response Time Targets
- **Authentication**: < 200ms (95th percentile)
- **Payment Initiation**: < 500ms (95th percentile)
- **Transaction Queries**: < 300ms (95th percentile)
- **Logbook Operations**: < 250ms (95th percentile)
- **Health Checks**: < 100ms (95th percentile)

### Rule P2.2: Pagination and Limiting
- **Default Page Size**: 20 items
- **Maximum Page Size**: 100 items
- **Offset Limits**: Use cursor-based pagination for large datasets
- **Response Size**: Limit response payload to 1MB maximum

### Rule P2.3: Async Processing
- **Queue Jobs**: Use queues for operations > 1 second
- **Background Tasks**: Email sending, SMS, audit logging
- **Batch Operations**: Process bulk operations asynchronously
- **Webhook Processing**: Handle webhooks asynchronously

## Frontend Performance Rules

### Rule P3.1: Loading Performance
- **First Contentful Paint**: < 1.5 seconds
- **Largest Contentful Paint**: < 2.5 seconds
- **Time to Interactive**: < 3.5 seconds
- **Cumulative Layout Shift**: < 0.1

### Rule P3.2: Bundle Optimization
- **Code Splitting**: Split code by routes and features
- **Tree Shaking**: Remove unused code from bundles
- **Compression**: Use gzip/brotli compression
- **CDN Usage**: Serve static assets from CDN

### Rule P3.3: Real-time Updates
- **WebSocket Connections**: Limit to 1 connection per user
- **Event Throttling**: Throttle high-frequency events (max 10/second)
- **Reconnection Strategy**: Exponential backoff for reconnections
- **Offline Support**: Cache critical data for offline access

## Queue Performance Rules

### Rule P4.1: Queue Processing
- **Concurrency**: Configure appropriate concurrency per queue type
  - Payment notifications: 5 concurrent jobs
  - Audit logs: 10 concurrent jobs
  - Email sending: 3 concurrent jobs
  - SMS sending: 2 concurrent jobs
- **Batch Size**: Process jobs in batches where possible
- **Priority Queues**: Use priority for critical operations

### Rule P4.2: Queue Monitoring
- **Queue Depth**: Alert if queue depth > 1000 jobs
- **Processing Time**: Monitor average job processing time
- **Failed Jobs**: Alert if failure rate > 5%
- **Dead Letter Queue**: Monitor DLQ size and process manually

## Memory and Resource Rules

### Rule P5.1: Memory Management
- **Heap Size**: Set appropriate heap size for Node.js services
- **Memory Leaks**: Monitor for memory leaks in long-running processes
- **Garbage Collection**: Tune GC settings for production
- **Resource Cleanup**: Always close connections and clean up resources

### Rule P5.2: CPU Optimization
- **CPU Usage**: Keep average CPU usage < 70%
- **Event Loop**: Monitor event loop lag (< 10ms)
- **Blocking Operations**: Avoid blocking the event loop
- **Worker Threads**: Use worker threads for CPU-intensive tasks

## Monitoring and Alerting Rules

### Rule P6.1: Performance Metrics
- **Response Time**: Track 50th, 95th, and 99th percentiles
- **Throughput**: Requests per second per service
- **Error Rate**: Percentage of failed requests
- **Availability**: Service uptime percentage

### Rule P6.2: Alert Thresholds
- **Response Time**: Alert if 95th percentile > target + 50%
- **Error Rate**: Alert if > 1% for 5 minutes
- **Queue Depth**: Alert if > 1000 jobs for 10 minutes
- **Memory Usage**: Alert if > 85% for 5 minutes
- **CPU Usage**: Alert if > 80% for 10 minutes

### Rule P6.3: Performance Testing
- **Load Testing**: Regular load tests with realistic traffic patterns
- **Stress Testing**: Test system limits and failure modes
- **Spike Testing**: Test handling of traffic spikes
- **Endurance Testing**: Test performance over extended periods

## Scalability Rules

### Rule P7.1: Horizontal Scaling
- **Stateless Services**: All services must be stateless
- **Load Balancing**: Use round-robin load balancing
- **Auto Scaling**: Configure auto-scaling based on CPU and memory
- **Database Scaling**: Use read replicas for read-heavy operations

### Rule P7.2: Vertical Scaling
- **Resource Allocation**: Monitor and adjust resource allocation
- **Container Limits**: Set appropriate CPU and memory limits
- **Database Resources**: Scale database resources based on usage
- **Cache Resources**: Scale Redis based on memory usage

## Network Performance Rules

### Rule P8.1: Network Optimization
- **Connection Pooling**: Reuse HTTP connections
- **Compression**: Enable gzip compression for API responses
- **CDN Usage**: Use CDN for static assets and API responses
- **DNS Optimization**: Use fast DNS providers

### Rule P8.2: External Service Calls
- **Timeout Configuration**: Set appropriate timeouts
  - Payment APIs: 30 seconds
  - SMS APIs: 10 seconds
  - Email APIs: 15 seconds
- **Retry Strategy**: Implement exponential backoff
- **Circuit Breakers**: Protect against cascading failures
- **Parallel Processing**: Make independent calls in parallel
