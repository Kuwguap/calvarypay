# CalvaryPay Project Rules and Best Practices

## 1. Database Schema Standards

### Rule 1.1: Table Structure Standards
- **Primary Keys**: Always use UUID with `gen_random_uuid()` for user-facing entities
- **Timestamps**: Every table MUST have `created_at` and `updated_at` with `TIMESTAMPTZ DEFAULT NOW()`
- **Soft Deletes**: Use `deleted_at TIMESTAMPTZ` instead of hard deletes for audit trail
- **Naming Convention**: Use `snake_case` for all database objects
- **Schema Separation**: Each service has its own schema (user_schema, payment_schema, etc.)

### Rule 1.2: Index Strategy
- **Performance Indexes**: Create indexes on all foreign keys and frequently queried columns
- **Composite Indexes**: Use for multi-column WHERE clauses (user_id, created_at)
- **GIN Indexes**: Use for JSONB columns that need searchability
- **Partial Indexes**: Use for filtered queries (WHERE active = true)

### Rule 1.3: Constraints and Validation
- **Foreign Keys**: Always use CASCADE or RESTRICT explicitly
- **Check Constraints**: Validate data at database level (amount_minor > 0)
- **Unique Constraints**: Use for business rules (email uniqueness)
- **NOT NULL**: Be explicit about required fields

### Rule 1.4: Row Level Security (RLS)
- **Enable RLS**: On ALL tables without exception
- **User Isolation**: Users can only access their own data unless admin
- **Service Role**: Use service_role for cross-user operations
- **Helper Functions**: Create reusable functions for common checks

## 2. API Design Standards

### Rule 2.1: RESTful Endpoint Structure
```
GET    /api/v1/users           # List users (paginated)
GET    /api/v1/users/:id       # Get specific user
POST   /api/v1/users           # Create user
PUT    /api/v1/users/:id       # Update user (full)
PATCH  /api/v1/users/:id       # Update user (partial)
DELETE /api/v1/users/:id       # Delete user
```

### Rule 2.2: Request/Response Format
- **Request Headers**: Always include `Content-Type: application/json`
- **Correlation ID**: Include `X-Correlation-ID` in all requests
- **Authentication**: Use `Authorization: Bearer <token>` header
- **Pagination**: Use `page`, `limit`, `offset` query parameters

### Rule 2.3: Response Structure
```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": {
    "correlationId": "uuid",
    "timestamp": "ISO8601",
    "service": "service-name"
  }
}
```

### Rule 2.4: Error Response Format
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human readable message",
    "details": {
      "field": "email",
      "reason": "Invalid format"
    }
  },
  "meta": {
    "correlationId": "uuid",
    "timestamp": "ISO8601",
    "service": "service-name"
  }
}
```

## 3. Authentication and Authorization

### Rule 3.1: JWT Token Structure
```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "roles": ["customer", "merchant"],
  "permissions": ["transactions:read", "transactions:write"],
  "iat": 1234567890,
  "exp": 1234567890,
  "iss": "CalvaryPay-auth",
  "aud": "CalvaryPay-services"
}
```

### Rule 3.2: Token Validation Middleware
- **Verify Signature**: Always validate JWT signature
- **Check Expiration**: Reject expired tokens
- **Validate Audience**: Ensure token is for correct service
- **Extract User Context**: Add user info to request object

### Rule 3.3: Service-to-Service Authentication
- **Internal JWT**: Use longer-lived tokens for service communication
- **API Keys**: Alternative for non-user operations
- **Mutual TLS**: For production inter-service communication

### Rule 3.4: Refresh Token Strategy
- **Rotation**: Generate new refresh token on each use
- **Expiration**: 7 days for refresh tokens, 15 minutes for access tokens
- **Revocation**: Store refresh tokens for revocation capability

## 4. Pricing Service Integration

### Rule 4.1: Price Snapshotting Mechanism
- **Snapshot on Transaction**: Capture current prices when transaction is initiated
- **Immutable Records**: Never modify price snapshots after creation
- **Version Tracking**: Link snapshots to specific price versions
- **Audit Trail**: Log all price changes with reasons

### Rule 4.2: Price Update Process
```
1. Validate new price
2. Create price history record
3. Update current price
4. Invalidate cache
5. Publish price update event
6. Notify affected services
```

### Rule 4.3: Currency Handling
- **Minor Units**: Store all amounts in minor units (kobo, cents)
- **Precision**: Use INTEGER for amounts, DECIMAL for rates
- **Conversion**: Always use latest rates for display, snapshot rates for transactions

## 5. Reconciliation Algorithm

### Rule 5.1: Matching Criteria (Priority Order)
1. **Exact Match**: Same user_id, amount, and timestamp within ±5 minutes
2. **Amount Proximity**: Same user_id, amount within ±5%, timestamp within ±10 minutes
3. **Manual Review**: Flag for human review if no automatic match

### Rule 5.2: Matching Tolerances
- **Time Window**: ±10 minutes for automatic matching
- **Amount Variance**: ±5% for fuel transactions, ±2% for cash
- **Currency**: Must be exact match
- **User Context**: Must be same user unless admin override

### Rule 5.3: Edge Cases
- **Duplicate Transactions**: Flag for review, don't auto-match
- **Split Payments**: Support manual linking of multiple transactions
- **Refunds**: Handle negative amounts appropriately
- **Cross-Currency**: Convert to base currency for comparison

## 6. Real-time Updates

### Rule 6.1: Supabase Realtime Integration
- **Channel Naming**: Use format `{schema}:{table}:{user_id}`
- **Event Types**: INSERT, UPDATE, DELETE
- **Filtering**: Use RLS policies for automatic filtering
- **Connection Management**: Handle reconnection automatically

### Rule 6.2: WebSocket Event Structure
```json
{
  "event": "INSERT",
  "schema": "payment_schema",
  "table": "transactions",
  "record": {},
  "old_record": null,
  "eventType": "INSERT"
}
```

### Rule 6.3: Frontend State Management
- **Optimistic Updates**: Update UI immediately, rollback on error
- **Conflict Resolution**: Last-write-wins with user notification
- **Offline Support**: Queue updates when offline, sync when online

## 7. Error Recovery Strategies

### Rule 7.1: External Service Failures
- **Circuit Breaker**: Open circuit after 5 consecutive failures
- **Retry Strategy**: Exponential backoff with jitter
- **Fallback Services**: Use secondary providers when available
- **Graceful Degradation**: Disable non-critical features

### Rule 7.2: Payment Provider Failures
- **Primary**: Paystack
- **Fallback**: Flutterwave (if configured)
- **Mock Mode**: For development and testing
- **User Notification**: Clear error messages with retry options

### Rule 7.3: Queue Processing Failures
- **Max Retries**: 3 attempts with exponential backoff
- **Dead Letter Queue**: Move failed jobs after max retries
- **Manual Recovery**: Admin interface for reprocessing
- **Alerting**: Notify operations team of persistent failures

### Rule 7.4: Database Failures
- **Connection Pooling**: Use connection pools with health checks
- **Read Replicas**: Use for read-heavy operations
- **Backup Strategy**: Automated daily backups with point-in-time recovery
- **Failover**: Automatic failover to backup database

## 8. Development Environment

### Rule 8.1: Local Development Setup
- **No Docker**: Use native processes for faster development
- **Process Manager**: Use PM2 for service orchestration
- **Hot Reload**: Enable for all services during development
- **Environment Isolation**: Separate .env files per environment

### Rule 8.2: Service Dependencies
- **Startup Order**: Database → Queue → Cache → Services → Frontend
- **Health Checks**: Each service exposes /health endpoint
- **Graceful Shutdown**: Handle SIGTERM for clean shutdowns
- **Port Management**: Fixed ports for consistent development

### Rule 8.3: Testing Strategy
- **Unit Tests**: 80% coverage minimum
- **Integration Tests**: Test service interactions
- **E2E Tests**: Critical user journeys
- **Load Tests**: Performance benchmarks

### Rule 8.4: Code Quality
- **TypeScript**: Strict mode enabled
- **ESLint**: Enforce coding standards
- **Prettier**: Consistent code formatting
- **Husky**: Pre-commit hooks for quality checks
