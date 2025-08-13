# CalvaryPay API Documentation

## Overview

CalvaryPay provides a comprehensive RESTful API for payment processing, user management, and audit logging. All APIs follow REST conventions and return JSON responses with consistent error handling.

## Base URLs

- **API Gateway**: `http://localhost:3000` (Production: `https://api.calvarypay.com`)
- **User Service**: `http://localhost:3001` (Internal)
- **Payment Service**: `http://localhost:3002` (Internal)
- **Audit Service**: `http://localhost:3003` (Internal)

> **Note**: All client requests should go through the API Gateway. Direct service access is for internal communication only.

## Authentication

CalvaryPay uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

### Getting a Token

```http
POST /api/users/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your-password"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe"
    },
    "tokens": {
      "accessToken": "jwt-token",
      "refreshToken": "refresh-token",
      "expiresIn": 900
    }
  }
}
```

## API Endpoints

### 🔐 Authentication & User Management

#### Register User
```http
POST /api/users/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890"
}
```

#### Login
```http
POST /api/users/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

#### Refresh Token
```http
POST /api/users/auth/refresh
Content-Type: application/json

{
  "refreshToken": "your-refresh-token"
}
```

#### Get User Profile
```http
GET /api/users/me
Authorization: Bearer <token>
```

#### Update User Profile
```http
PUT /api/users/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "+1987654321"
}
```

#### Change Password
```http
PUT /api/users/me/password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass123!"
}
```

### 📖 Digital Logbook Management

#### Create Logbook Entry
```http
POST /api/logbook/entries
Authorization: Bearer <token>
Content-Type: multipart/form-data

Fields:
- type: "fuel" | "cash" | "misc"
- amount: number (e.g., 50.00)
- currency: "NGN" | "KES" | "GHS" | "ZAR" | "USD"
- note: string (optional, max 500 chars)
- photo: file (optional, max 5MB, images only)
- location: JSON string (optional, {lat, lng, address})
- clientId: string (optional, for offline sync)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "type": "fuel",
    "amount": 50.00,
    "currency": "NGN",
    "note": "Fuel purchase",
    "photoUrl": "https://storage.url/photo.jpg",
    "location": {
      "lat": 6.5244,
      "lng": 3.3792,
      "address": "Lagos, Nigeria"
    },
    "isReconciled": false,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

#### Get User Logbook Entries
```http
GET /api/logbook/entries?page=1&limit=20&type=fuel&currency=NGN&isReconciled=false&startDate=2024-01-01T00:00:00Z&endDate=2024-01-31T23:59:59Z
Authorization: Bearer <token>
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `type`: Filter by entry type (fuel, cash, misc)
- `currency`: Filter by currency (NGN, KES, GHS, ZAR, USD)
- `isReconciled`: Filter by reconciliation status (true/false)
- `startDate`: Start date filter (ISO 8601)
- `endDate`: End date filter (ISO 8601)

#### Get Logbook Entry by ID
```http
GET /api/logbook/entries/{entryId}
Authorization: Bearer <token>
```

#### Offline Sync
```http
POST /api/logbook/sync
Authorization: Bearer <token>
Content-Type: application/json

{
  "entries": [
    {
      "type": "cash",
      "amount": 25.50,
      "currency": "NGN",
      "note": "Offline cash entry",
      "clientId": "offline_123_1",
      "createdAt": "2024-01-15T08:30:00Z"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "syncResults": [
      {
        "clientId": "offline_123_1",
        "status": "synced",
        "serverId": "uuid"
      }
    ],
    "totalProcessed": 1,
    "correlationId": "sync-uuid"
  }
}
```

### 💳 Payment Processing

#### Initiate Payment
```http
POST /api/payments/initiate
Authorization: Bearer <token>
Content-Type: application/json
Idempotency-Key: unique-key-123

{
  "amount": 50000,
  "currency": "NGN",
  "channel": "card",
  "description": "Payment for services",
  "callbackUrl": "https://yourapp.com/callback",
  "metadata": {
    "orderId": "order-123",
    "customerId": "customer-456"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reference": "CalvaryPay_1234567890_abcd1234",
    "authorizationUrl": "https://checkout.paystack.com/xyz",
    "accessCode": "access-code-123"
  }
}
```

#### Verify Payment
```http
POST /api/payments/verify/CalvaryPay_1234567890_abcd1234
Authorization: Bearer <token>
```

#### Get Payment by Reference
```http
GET /api/payments/reference/CalvaryPay_1234567890_abcd1234
Authorization: Bearer <token>
```

#### Get User Transactions
```http
GET /api/payments/transactions?page=1&limit=20&status=success&currency=NGN
Authorization: Bearer <token>
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `status`: Filter by status (pending, processing, success, failed, cancelled)
- `currency`: Filter by currency (NGN, USD, KES, GHS, ZAR)

### 📊 Audit & Reporting (Admin Only)

#### Get Audit Logs
```http
GET /api/audit/logs?page=1&limit=20&type=payment.initiated&startDate=2024-01-01T00:00:00Z
Authorization: Bearer <admin-token>
```

**Query Parameters:**
- `page`: Page number
- `limit`: Items per page
- `type`: Event type filter
- `actorUserId`: Filter by user ID
- `correlationId`: Filter by correlation ID
- `startDate`: Start date (ISO 8601)
- `endDate`: End date (ISO 8601)

#### Get Audit Log by ID
```http
GET /api/audit/logs/{logId}
Authorization: Bearer <admin-token>
```

#### Get Audit Statistics
```http
GET /api/audit/stats
Authorization: Bearer <admin-token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalLogs": 15420,
    "logsByType": {
      "user.login": 5230,
      "payment.initiated": 3450,
      "payment.completed": 2890
    },
    "logsByDay": [
      {"date": "2024-01-01", "count": 234},
      {"date": "2024-01-02", "count": 456}
    ],
    "topUsers": [
      {"userId": "user-123", "count": 89},
      {"userId": "user-456", "count": 67}
    ],
    "recentActivity": [...]
  }
}
```

### 🏥 Health Checks

#### API Gateway Health
```http
GET /health
```

#### Detailed Health Check
```http
GET /health/detailed
```

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00Z",
    "service": "api-gateway",
    "version": "1.0.0",
    "environment": "production",
    "uptime": 86400,
    "responseTime": 45,
    "dependencies": {
      "userService": {"status": "healthy", "responseTime": 12},
      "paymentService": {"status": "healthy", "responseTime": 18},
      "auditService": {"status": "healthy", "responseTime": 8},
      "database": {"status": "healthy", "responseTime": 5},
      "redis": {"status": "healthy", "responseTime": 2}
    }
  }
}
```

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data here
  },
  "error": null,
  "meta": {
    "correlationId": "req-123-456-789",
    "timestamp": "2024-01-15T10:30:00Z",
    "service": "api-gateway"
  }
}
```

### Error Response
```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": "Email is required"
  },
  "meta": {
    "correlationId": "req-123-456-789",
    "timestamp": "2024-01-15T10:30:00Z",
    "service": "api-gateway"
  }
}
```

### Paginated Response
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

## HTTP Status Codes

- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (duplicate)
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: Service temporarily unavailable

## Error Codes

### Authentication Errors
- `NOT_AUTHENTICATED`: User not authenticated
- `INVALID_CREDENTIALS`: Invalid email or password
- `TOKEN_EXPIRED`: JWT token has expired
- `INVALID_REFRESH_TOKEN`: Refresh token is invalid

### Validation Errors
- `VALIDATION_ERROR`: Request validation failed
- `MISSING_REQUIRED_FIELD`: Required field is missing
- `INVALID_FORMAT`: Field format is invalid

### Payment Errors
- `PAYMENT_INITIATION_ERROR`: Payment initialization failed
- `PAYMENT_VERIFICATION_ERROR`: Payment verification failed
- `DUPLICATE_REQUEST`: Duplicate payment request
- `INSUFFICIENT_FUNDS`: Insufficient account balance

### System Errors
- `INTERNAL_ERROR`: Internal server error
- `SERVICE_UNAVAILABLE`: Service temporarily unavailable
- `RATE_LIMIT_EXCEEDED`: Too many requests

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Default**: 100 requests per minute per IP address
- **Authenticated**: 1000 requests per minute per user
- **Payment endpoints**: 10 requests per minute per user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248600
```

## Webhooks

### Paystack Webhooks

CalvaryPay automatically handles Paystack webhooks for payment updates:

```http
POST /api/payments/webhooks/paystack
Content-Type: application/json
X-Paystack-Signature: signature

{
  "event": "charge.success",
  "data": {
    "reference": "CalvaryPay_1234567890_abcd1234",
    "amount": 50000,
    "currency": "NGN",
    "status": "success"
  }
}
```

## SDKs and Libraries

### JavaScript/TypeScript
```bash
npm install @CalvaryPay/sdk
```

```javascript
import { CalvaryPay } from '@CalvaryPay/sdk';

const client = new CalvaryPay({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.CalvaryPay.com'
});

// Initiate payment
const payment = await client.payments.initiate({
  amount: 50000,
  currency: 'NGN',
  email: 'customer@example.com'
});
```

## Testing

### Test Environment
- Base URL: `https://api-test.CalvaryPay.com`
- Use test API keys and credentials
- No real money transactions

### Postman Collection
Import our Postman collection for easy API testing:
[Download CalvaryPay.postman_collection.json](./postman/CalvaryPay.postman_collection.json)

## Support

- **Documentation**: https://docs.CalvaryPay.com
- **Support Email**: support@CalvaryPay.com
- **Developer Portal**: https://developers.CalvaryPay.com
- **Status Page**: https://status.CalvaryPay.com
