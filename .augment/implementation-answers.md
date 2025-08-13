# CalvaryPay Implementation Questions - Definitive Answers

## 1. Database Schema Specifics ✅

### **RULE**: Complete DDL with Performance Optimization
- **Primary Keys**: UUID with `gen_random_uuid()` for all user-facing entities
- **Timestamps**: `created_at` and `updated_at TIMESTAMPTZ DEFAULT NOW()` on every table
- **Schema Separation**: 4 schemas (user_schema, payment_schema, audit_schema, pricing_schema)
- **Indexes**: Composite indexes on (user_id, created_at), GIN indexes on JSONB columns
- **RLS Policies**: Enabled on ALL tables with user isolation and service role access
- **Constraints**: Foreign keys with explicit CASCADE/RESTRICT, check constraints for business rules

### **Implementation Files**:
- `database/migrations/001_create_schemas.sql` - Complete table definitions
- `database/migrations/002_create_rls_policies.sql` - Security policies
- `database/seeds/001_initial_data.sql` - Demo data and initial setup

## 2. API Endpoint Specifications ✅

### **RULE**: RESTful Design with Consistent Response Format
- **URL Structure**: `/api/v1/{resource}` with standard HTTP methods
- **Request Headers**: `Authorization: Bearer <token>`, `X-Correlation-ID`, `Content-Type: application/json`
- **Response Format**: Standardized with `success`, `data`, `error`, and `meta` fields
- **Pagination**: `page`, `limit`, `offset` parameters with metadata
- **Error Codes**: Consistent error codes (VALIDATION_ERROR, AUTHENTICATION_ERROR, etc.)

### **Standard Response Structure**:
```json
{
  "success": boolean,
  "data": object | array | null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message",
    "details": object
  } | null,
  "meta": {
    "correlationId": "uuid",
    "timestamp": "ISO8601",
    "service": "service-name"
  }
}
```

## 3. Authentication Flow Details ✅

### **RULE**: JWT with Refresh Token Rotation
- **JWT Structure**: RS256 algorithm with sub, email, roles, permissions, iat, exp, iss, aud
- **Token Expiry**: Access tokens 15 minutes, refresh tokens 7 days
- **Validation**: Signature verification, expiration check, audience validation
- **Service-to-Service**: Internal JWT with longer expiry or API keys
- **Middleware**: Extract user context and add to request object

### **JWT Payload Standard**:
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

## 4. Pricing Service Integration ✅

### **RULE**: Immutable Price Snapshots with Audit Trail
- **Snapshot Timing**: Capture current prices when transaction is initiated
- **Immutability**: Never modify price snapshots after creation
- **Version Tracking**: Link snapshots to specific price versions with history
- **Update Process**: Validate → Create history → Update current → Invalidate cache → Publish event
- **Currency Handling**: Store amounts in minor units (INTEGER), rates as DECIMAL

### **Price Update Flow**:
1. Validate new price
2. Create price_history record
3. Update current price
4. Invalidate Redis cache
5. Publish price.updated event
6. Notify affected services via queue

## 5. Reconciliation Algorithm ✅

### **RULE**: Multi-Criteria Matching with Tolerance Levels
- **Priority Order**: Exact match → Amount proximity → Manual review
- **Time Window**: ±10 minutes for automatic matching
- **Amount Tolerance**: ±5% for fuel transactions, ±2% for cash
- **Matching Score**: 100-point system (40 for amount, 30 for time, 20 for currency, 10 for type)
- **Minimum Score**: 60 points for automatic matching

### **Matching Criteria**:
1. **Exact Match**: Same user_id, amount, timestamp within ±5 minutes (Score: 100)
2. **Amount Proximity**: Same user_id, amount within tolerance, timestamp within ±10 minutes
3. **Manual Review**: Flag for human review if score < 60

### **Edge Cases**:
- Duplicate transactions → Flag for review
- Split payments → Manual linking support
- Refunds → Handle negative amounts
- Cross-currency → Convert to base currency

## 6. Real-time Updates ✅

### **RULE**: Supabase Realtime with Optimistic Updates
- **Channel Naming**: `{schema}:{table}:{user_id}` format
- **Event Types**: INSERT, UPDATE, DELETE with RLS filtering
- **Connection Management**: Auto-reconnection with exponential backoff
- **Frontend Strategy**: Optimistic updates with rollback on error
- **Conflict Resolution**: Last-write-wins with user notification

### **WebSocket Event Structure**:
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

## 7. Error Recovery Strategies ✅

### **RULE**: Circuit Breaker with Exponential Backoff
- **Circuit Breaker**: Open after 5 consecutive failures, 60-second recovery timeout
- **Retry Strategy**: Exponential backoff with jitter, max 3 attempts
- **Fallback Services**: Secondary providers (Flutterwave for payments)
- **Graceful Degradation**: Disable non-critical features during failures

### **External Service Failures**:
- **Primary**: Paystack
- **Fallback**: Flutterwave (if configured)
- **Mock Mode**: For development and testing
- **User Notification**: Clear error messages with retry options

### **Queue Processing Failures**:
- **Max Retries**: 3 attempts with exponential backoff
- **Dead Letter Queue**: Move failed jobs after max retries
- **Manual Recovery**: Admin interface for reprocessing
- **Alerting**: Notify operations team of persistent failures

## 8. Development Environment Setup ✅

### **RULE**: Local Development without Docker
- **Process Manager**: PM2 for service orchestration
- **Startup Order**: Database → Queue → Cache → Services → Frontend
- **Health Checks**: Each service exposes `/health` endpoint
- **Hot Reload**: Enabled for all services during development
- **Port Management**: Fixed ports (Gateway:3000, User:3001, Payment:3002, etc.)

### **Service Dependencies**:
- **Supabase**: Serverless PostgreSQL database
- **CloudAMQP**: Serverless RabbitMQ message queue
- **Upstash Redis**: Serverless Redis cache
- **Local Services**: All microservices run as separate Node.js processes

### **Development Scripts**:
```bash
npm run dev          # Start all services
npm run build        # Build all services
npm run test         # Run all tests
npm run start:prod   # Start with PM2
npm run logs         # View PM2 logs
npm run monitor      # PM2 monitoring
```

## Implementation Priority Matrix

### **Phase 1 - Foundation (Hours 0-8)**
1. ✅ Database schemas and RLS policies
2. ✅ Shared TypeScript types
3. ✅ Authentication service with JWT
4. ✅ API Gateway with routing

### **Phase 2 - Core Services (Hours 8-16)**
1. User service with registration/login
2. Payment service with Paystack integration
3. RabbitMQ queue service implementation
4. Basic audit logging

### **Phase 3 - Business Logic (Hours 16-24)**
1. Digital logbook with offline support
2. Reconciliation algorithm implementation
3. Pricing service with snapshots
4. Real-time updates via Supabase

### **Phase 4 - Frontend (Hours 24-32)**
1. Next.js app with authentication
2. Payment flow integration
3. Dashboard with real-time updates
4. Mobile-responsive design

### **Phase 5 - Integration (Hours 32-40)**
1. End-to-end testing
2. Error handling and retry mechanisms
3. Performance optimization
4. Security hardening

### **Phase 6 - Polish (Hours 40-48)**
1. UI/UX improvements
2. Documentation completion
3. Demo preparation
4. Final testing and deployment

## Critical Success Factors

### **Must-Have Features**:
1. ✅ Secure authentication with JWT
2. ✅ Payment processing with Paystack
3. ✅ Digital logbook with reconciliation
4. ✅ Real-time dashboard updates
5. ✅ Comprehensive audit trail

### **Risk Mitigation**:
1. **Queue Service** → RabbitMQ with CloudAMQP fallback
2. **Payment Integration** → Paystack with Flutterwave fallback
3. **Real-time Features** → Supabase Realtime with polling fallback
4. **Database** → Supabase with local PostgreSQL fallback

### **Performance Targets**:
- Authentication: < 200ms (95th percentile)
- Payment initiation: < 500ms (95th percentile)
- Transaction queries: < 300ms (95th percentile)
- Real-time updates: < 100ms latency

This comprehensive rule set ensures consistent implementation across all services and provides clear guidance for the 48-hour hackathon timeline.
