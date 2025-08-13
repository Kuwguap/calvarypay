# CalvaryPay Microservices

A production-ready microservices architecture for payment processing with comprehensive audit logging, user management, and API gateway.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Mobile App    │    │  External APIs  │
│   (React/Vue)   │    │   (React Native)│    │   (Webhooks)    │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼───────────────┐
                    │       API Gateway           │
                    │   (Port 3000)              │
                    │   - Authentication         │
                    │   - Rate Limiting          │
                    │   - Request Routing        │
                    │   - CORS & Security        │
                    └─────────────┬───────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                       │                        │
┌───────▼────────┐    ┌─────────▼────────┐    ┌─────────▼────────┐
│  User Service  │    │ Payment Service  │    │  Audit Service   │
│  (Port 3001)   │    │  (Port 3002)     │    │  (Port 3003)     │
│                │    │                  │    │                  │
│ - Registration │    │ - Paystack Integ │    │ - Event Logging  │
│ - Authentication│    │ - Transactions   │    │ - Audit Reports  │
│ - User Mgmt    │    │ - Webhooks       │    │ - Compliance     │
│ - JWT Tokens   │    │ - Idempotency    │    │ - Integrity      │
└────────────────┘    └──────────────────┘    └──────────────────┘
        │                       │                        │
        └───────────────────────┼────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │    Shared Library   │
                    │                     │
                    │ - Common Types      │
                    │ - Database Service  │
                    │ - Redis Service     │
                    │ - JWT Middleware    │
                    │ - Logger            │
                    └─────────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                     │                      │
┌───────▼────────┐    ┌───────▼────────┐    ┌───────▼────────┐
│   Supabase     │    │     Redis      │    │   External     │
│   Database     │    │     Cache      │    │   Services     │
│                │    │                │    │                │
│ - Users        │    │ - Sessions     │    │ - Paystack API │
│ - Transactions │    │ - Rate Limits  │    │ - Email Service│
│ - Audit Logs   │    │ - Idempotency  │    │ - SMS Service  │
└────────────────┘    └────────────────┘    └────────────────┘
```

## 🚀 Services

### 1. API Gateway (Port 3000)
- **Purpose**: Single entry point for all client requests
- **Features**:
  - JWT Authentication & Authorization
  - Rate limiting (100 req/min per IP)
  - CORS configuration
  - Request/Response logging
  - Service discovery and routing
  - OpenAPI documentation

### 2. User Service (Port 3001)
- **Purpose**: User management and authentication
- **Features**:
  - User registration with email verification
  - Login/logout with JWT tokens
  - Password management with bcrypt
  - Role-based access control
  - User profile management
  - Refresh token handling

### 3. Payment Service (Port 3002)
- **Purpose**: Payment processing, transaction management, and digital logbook
- **Features**:
  - Paystack integration for card payments
  - Transaction lifecycle management
  - Webhook handling for payment updates
  - Idempotency for duplicate prevention
  - Multi-currency support (NGN, USD, KES, GHS, ZAR)
  - Payment verification and reconciliation
  - **NEW**: Digital logbook entry management
  - **NEW**: Photo upload with location tracking
  - **NEW**: Offline sync capabilities
  - **NEW**: Advanced filtering and pagination

### 4. Audit Service (Port 3003)
- **Purpose**: Comprehensive audit logging and compliance
- **Features**:
  - Event sourcing for all system activities
  - HMAC signature verification for log integrity
  - Audit trail reporting and analytics
  - Compliance reporting
  - Log retention management
  - Real-time audit statistics

### 5. Shared Library
- **Purpose**: Common utilities and types across services
- **Features**:
  - Database connection management (Supabase)
  - Redis caching service
  - JWT middleware for authentication
  - Structured logging with correlation IDs
  - Common TypeScript types and interfaces
  - Error handling utilities

## 🛠️ Technology Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: Supabase (PostgreSQL)
- **Cache**: Redis
- **Authentication**: JWT
- **Payment**: Paystack
- **Validation**: express-validator
- **Security**: helmet, bcryptjs
- **Logging**: Winston
- **Documentation**: OpenAPI/Swagger

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+
- Redis server
- Supabase account
- Paystack account (for payments)

### Quick Start

1. **Clone and install dependencies**:
```bash
# Install all service dependencies
./build-all.ps1
```

2. **Environment Configuration**:
Create `.env` files in each service directory with the following variables:

#### API Gateway (.env)
```env
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=info

# Service URLs
USER_SERVICE_URL=http://localhost:3001
PAYMENT_SERVICE_URL=http://localhost:3002
AUDIT_SERVICE_URL=http://localhost:3003

# Security
JWT_SECRET=your-jwt-secret-key
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

#### User Service (.env)
```env
NODE_ENV=development
PORT=3001
HOST=0.0.0.0
LOG_LEVEL=info

# JWT Configuration
JWT_SECRET=your-jwt-secret-key
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
JWT_ISSUER=CalvaryPay-user-service
JWT_AUDIENCE=CalvaryPay-api

# Password Hashing
BCRYPT_SALT_ROUNDS=12

# Database
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password

# Email (Optional)
EMAIL_ENABLED=false
EMAIL_PROVIDER=sendgrid
EMAIL_API_KEY=your-email-api-key
```

#### Payment Service (.env)
```env
NODE_ENV=development
PORT=3002
HOST=0.0.0.0
LOG_LEVEL=info

# Paystack Configuration
PAYSTACK_SECRET_KEY=your-paystack-secret-key
PAYSTACK_PUBLIC_KEY=your-paystack-public-key
PAYSTACK_WEBHOOK_SECRET=your-paystack-webhook-secret
PAYSTACK_BASE_URL=https://api.paystack.co

# Database
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password

# Idempotency
IDEMPOTENCY_TTL_SECONDS=3600

# Webhooks
WEBHOOK_RETRY_ATTEMPTS=3
WEBHOOK_RETRY_DELAY_MS=1000
```

#### Audit Service (.env)
```env
NODE_ENV=development
PORT=3003
HOST=0.0.0.0
LOG_LEVEL=info

# Database
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Redis
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your-redis-password

# Audit Configuration
AUDIT_RETENTION_DAYS=2555
AUDIT_BATCH_SIZE=100
AUDIT_FLUSH_INTERVAL_MS=5000

# HMAC for log integrity
AUDIT_HMAC_SECRET=your-audit-hmac-secret
AUDIT_HMAC_ALGORITHM=sha256
```

3. **Database Setup**:
Run the database migrations in Supabase:
```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  amount INTEGER NOT NULL,
  currency VARCHAR(3) NOT NULL,
  status VARCHAR(20) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  reference VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit logs table
CREATE TABLE audit_logs (
  id VARCHAR(255) PRIMARY KEY,
  event_time TIMESTAMP WITH TIME ZONE NOT NULL,
  type VARCHAR(100) NOT NULL,
  correlation_id VARCHAR(255) NOT NULL,
  actor_user_id UUID,
  actor_type VARCHAR(50),
  resource_id VARCHAR(255),
  resource_type VARCHAR(100),
  action VARCHAR(100) NOT NULL,
  outcome VARCHAR(20) NOT NULL,
  payload JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  signature_hmac VARCHAR(255) NOT NULL
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_reference ON transactions(reference);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_audit_logs_event_time ON audit_logs(event_time);
CREATE INDEX idx_audit_logs_type ON audit_logs(type);
CREATE INDEX idx_audit_logs_correlation_id ON audit_logs(correlation_id);
CREATE INDEX idx_audit_logs_actor_user_id ON audit_logs(actor_user_id);
```

4. **Start Services**:
```bash
# Terminal 1 - API Gateway
cd api-gateway && npm run dev

# Terminal 2 - User Service
cd user-service && npm run dev

# Terminal 3 - Payment Service
cd payment-service && npm run dev

# Terminal 4 - Audit Service
cd audit-service && npm run dev
```

## 🧪 Testing

### Build Validation
```bash
# Test all services build successfully
./build-all.ps1
```

### API Testing
The API Gateway exposes OpenAPI documentation at:
- Development: http://localhost:3000/docs
- Health checks: http://localhost:3000/health

### Service Health Checks
- API Gateway: http://localhost:3000/health
- User Service: http://localhost:3001/health
- Payment Service: http://localhost:3002/health
- Audit Service: http://localhost:3003/health

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Prevents API abuse
- **CORS Protection**: Configurable cross-origin policies
- **Input Validation**: Comprehensive request validation
- **Password Security**: bcrypt hashing with salt rounds
- **Audit Logging**: Complete audit trail with HMAC integrity
- **Idempotency**: Prevents duplicate payment processing

## 📊 Monitoring & Observability

- **Structured Logging**: JSON logs with correlation IDs
- **Health Checks**: Kubernetes-ready health endpoints
- **Audit Trail**: Complete system activity logging
- **Error Tracking**: Comprehensive error handling and logging

## 🚀 Deployment

The services are containerized and ready for deployment on:
- Docker/Docker Compose
- Kubernetes
- Cloud platforms (AWS, GCP, Azure)

## 📝 API Documentation

Complete API documentation is available via OpenAPI/Swagger at each service's `/docs` endpoint when running in development mode.

## 🤝 Contributing

1. Follow TypeScript best practices
2. Maintain test coverage
3. Update documentation
4. Follow conventional commit messages
5. Ensure all services build successfully

## 📄 License

MIT License - see LICENSE file for details.
