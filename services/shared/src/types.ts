// EliteEpay Shared Types
// Common types used across all microservices

// Base Error Class
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }

    this.name = 'AppError';
  }
}

// JWT Payload Interface
export interface JWTPayload {
  sub: string; // User ID or 'service'
  email?: string;
  roles?: string[];
  permissions?: string[];
  service_name?: string; // For service tokens
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data: T | null;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta: {
    correlationId: string;
    timestamp: string;
    service: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

// Pagination Types
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// User Types
export interface User {
  id: string;
  email: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  isActive: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserRole {
  id: number;
  name: string;
  description?: string;
  permissions: string[];
}

// Transaction Types
export interface Transaction {
  id: string;
  userId: string;
  amount: number; // In minor units (kobo, cents)
  currency: string;
  status: 'pending' | 'processing' | 'success' | 'failed' | 'cancelled';
  provider: string;
  reference: string;
  description?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentInitiateRequest {
  amount: number;
  currency: string;
  channel?: 'card' | 'bank' | 'mobile_money' | 'ussd';
  description?: string;
  metadata?: Record<string, any>;
  callbackUrl?: string;
}

export interface PaymentInitiateResponse {
  transactionId: string;
  reference: string;
  authorizationUrl: string;
  accessCode: string;
}

// Audit Types
export interface AuditLog {
  id: string;
  eventTime: string;
  type: string;
  correlationId: string;
  actorUserId?: string;
  actorType?: string;
  resourceId?: string;
  resourceType?: string;
  action: string;
  outcome: 'success' | 'failure';
  payload: Record<string, any>;
  metadata?: Record<string, any>;
  signatureHmac: string;
}

export interface AuditEvent {
  type: string;
  actorUserId?: string;
  payload: Record<string, any>;
  correlationId: string;
}

// Pricing Types
export interface PriceConfig {
  key: string;
  name: string;
  description?: string;
  currency: string;
  amount: number; // In minor units
  isActive: boolean;
  validFrom?: string;
  validTo?: string;
  metadata?: Record<string, any>;
}

// Service Health Types
export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  service: string;
  version: string;
  uptime: number;
  dependencies: {
    [key: string]: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      error?: string;
    };
  };
}

// Queue Message Types
export interface QueueMessage {
  id: string;
  type: string;
  payload: Record<string, any>;
  correlationId: string;
  timestamp: string;
  retryCount?: number;
  maxRetries?: number;
}

// Cache Types
export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // For cache invalidation
}

// Validation Types
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Webhook Types
export interface WebhookPayload {
  event: string;
  data: Record<string, any>;
  timestamp: string;
  signature?: string;
}

// Rate Limiting Types
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: any) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// Correlation ID Types
export interface CorrelationContext {
  correlationId: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
}

// Environment Types
export type Environment = 'development' | 'staging' | 'production' | 'test';

// Service Configuration Types
export interface ServiceConfig {
  name: string;
  version: string;
  environment: Environment;
  port: number;
  host: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

// Database Schema Types
export type DatabaseSchema = 'user_schema' | 'payment_schema' | 'audit_schema' | 'pricing_schema';

// Currency Types
export type SupportedCurrency = 'NGN' | 'KES' | 'GHS' | 'ZAR' | 'USD';

// Payment Provider Types
export type PaymentProvider = 'paystack' | 'flutterwave' | 'stripe';

// Event Types for Audit
export type AuditEventType = 
  | 'user.registered'
  | 'user.login'
  | 'user.logout'
  | 'user.password_changed'
  | 'user.role_assigned'
  | 'payment.initiated'
  | 'payment.processing'
  | 'payment.succeeded'
  | 'payment.failed'
  | 'payment.cancelled'
  | 'payment.refunded'
  | 'pricing.updated'
  | 'system.error'
  | 'system.warning';

// HTTP Status Codes
export enum HttpStatusCode {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504
}

// Request Context (for middleware)
export interface RequestContext {
  correlationId: string;
  userId?: string;
  userEmail?: string;
  userRoles?: string[];
  serviceName?: string;
  startTime: number;
}
