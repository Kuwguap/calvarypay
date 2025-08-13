// CalvaryPay Shared TypeScript Types
// This file contains all shared type definitions across the system

// ========================================
// COMMON TYPES
// ========================================

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    correlationId: string;
    timestamp: string;
    service: string;
  };
}

// ========================================
// USER TYPES
// ========================================

export interface User extends BaseEntity {
  email: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  is_active: boolean;
  email_verified: boolean;
  phone_verified: boolean;
}

export interface Role {
  id: number;
  name: string;
  description?: string;
  permissions: string[];
  created_at: string;
}

export interface UserRole {
  user_id: string;
  role_id: number;
  assigned_at: string;
  assigned_by?: string;
}

export interface RefreshToken extends BaseEntity {
  user_id: string;
  token_hash: string;
  expires_at: string;
  revoked: boolean;
}

export interface UserSession extends BaseEntity {
  user_id: string;
  session_token: string;
  ip_address?: string;
  user_agent?: string;
  expires_at: string;
}

// ========================================
// AUTHENTICATION TYPES
// ========================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface JWTPayload {
  sub: string; // user_id
  email: string;
  roles: string[];
  iat: number;
  exp: number;
}

// ========================================
// PAYMENT TYPES
// ========================================

export type TransactionStatus = 'pending' | 'processing' | 'success' | 'failed' | 'cancelled';
export type PaymentProvider = 'paystack' | 'flutterwave' | 'mock';
export type PaymentChannel = 'card' | 'bank' | 'mobile_money' | 'ussd' | 'qr';
export type Currency = 'NGN' | 'KES' | 'GHS' | 'ZAR' | 'USD' | 'EUR' | 'GBP';

export interface Transaction extends BaseEntity {
  user_id: string;
  reference: string;
  amount_minor: number; // Amount in minor units (kobo, cents)
  currency: Currency;
  status: TransactionStatus;
  provider: PaymentProvider;
  provider_reference?: string;
  authorization_url?: string;
  payment_method?: string;
  channel?: PaymentChannel;
  metadata?: Record<string, any>;
  fees_minor?: number;
  settled_amount_minor?: number;
  settlement_date?: string;
}

export interface PaymentInitiateRequest {
  amount: number; // Amount in major units (naira, dollars)
  currency: Currency;
  channel?: PaymentChannel;
  metadata?: Record<string, any>;
  callback_url?: string;
}

export interface PaymentInitiateResponse {
  reference: string;
  authorization_url: string;
  access_code?: string;
}

export interface PaymentWebhookPayload {
  event: string;
  data: {
    reference: string;
    status: string;
    amount: number;
    currency: string;
    paid_at?: string;
    channel?: string;
    fees?: number;
    customer?: any;
    metadata?: any;
  };
}

// ========================================
// LOGBOOK TYPES
// ========================================

export type LogbookEntryType = 'fuel' | 'cash' | 'misc';

export interface LogbookEntry extends BaseEntity {
  user_id: string;
  type: LogbookEntryType;
  amount_minor: number;
  currency: Currency;
  note?: string;
  photo_url?: string;
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
  is_reconciled: boolean;
  reconciled_transaction_id?: string;
}

export interface LogbookEntryRequest {
  type: LogbookEntryType;
  amount: number; // Amount in major units
  currency: Currency;
  note?: string;
  photo_url?: string;
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
}

// ========================================
// PRICING TYPES
// ========================================

export interface Price extends BaseEntity {
  key: string;
  name: string;
  description?: string;
  amount_minor: number;
  currency: Currency;
  active: boolean;
  category?: string;
  metadata?: Record<string, any>;
  created_by?: string;
}

export interface PriceHistory {
  id: string;
  price_id: string;
  key: string;
  old_amount_minor?: number;
  new_amount_minor: number;
  currency: Currency;
  change_reason?: string;
  changed_by?: string;
  changed_at: string;
}

export interface CurrencyRate {
  id: string;
  base_currency: Currency;
  quote_currency: Currency;
  rate: number;
  source: string;
  fetched_at: string;
  expires_at?: string;
}

export interface PriceUpdateRequest {
  amount: number; // Amount in major units
  change_reason?: string;
}

// ========================================
// AUDIT TYPES
// ========================================

export type AuditEventType = 
  | 'user.created' | 'user.updated' | 'user.deleted' | 'user.login' | 'user.logout'
  | 'payment.initiated' | 'payment.succeeded' | 'payment.failed' | 'payment.cancelled'
  | 'logbook.created' | 'logbook.updated' | 'logbook.reconciled'
  | 'pricing.updated' | 'pricing.created'
  | 'admin.action' | 'system.error' | 'security.alert';

export interface AuditLog {
  id: string;
  event_time: string;
  actor_user_id?: string;
  event_type: AuditEventType;
  correlation_id?: string;
  payload: Record<string, any>;
  signature_hmac?: string;
  ip_address?: string;
  user_agent?: string;
  service_name?: string;
  created_at: string;
}

export interface SystemEvent {
  id: string;
  event_type: string;
  severity: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  message: string;
  details?: Record<string, any>;
  service_name?: string;
  correlation_id?: string;
  created_at: string;
}

export interface ErrorLog {
  id: string;
  error_type: string;
  error_message: string;
  stack_trace?: string;
  request_data?: Record<string, any>;
  user_id?: string;
  correlation_id?: string;
  service_name?: string;
  resolved: boolean;
  created_at: string;
}

// ========================================
// RECONCILIATION TYPES
// ========================================

export interface ReconciliationReport extends BaseEntity {
  report_date: string;
  total_transactions: number;
  matched_transactions: number;
  unmatched_transactions: number;
  total_amount_minor: number;
  discrepancies: ReconciliationDiscrepancy[];
  generated_by?: string;
  generated_at: string;
}

export interface ReconciliationDiscrepancy {
  type: 'unmatched_transaction' | 'unmatched_logbook' | 'amount_mismatch';
  transaction_id?: string;
  logbook_entry_id?: string;
  expected_amount?: number;
  actual_amount?: number;
  description: string;
}

// ========================================
// NOTIFICATION TYPES
// ========================================

export interface EmailNotification {
  to: string | string[];
  subject: string;
  template?: string;
  data?: Record<string, any>;
  html?: string;
  text?: string;
}

export interface SMSNotification {
  to: string;
  message: string;
  sender_id?: string;
}

// ========================================
// QUEUE TYPES
// ========================================

export interface QueueJob {
  id: string;
  type: string;
  data: any;
  options?: {
    delay?: number;
    priority?: number;
    attempts?: number;
    backoff?: 'exponential' | 'fixed';
    ttl?: number;
  };
  attempts: number;
  created_at: Date;
  processed_at?: Date;
}

export type QueueJobType = 
  | 'payment.notification'
  | 'audit.log'
  | 'user.welcome'
  | 'reconciliation.process'
  | 'pricing.update'
  | 'email.send'
  | 'sms.send';

// ========================================
// HEALTH CHECK TYPES
// ========================================

export interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  service: string;
  version: string;
  checks: {
    database: HealthCheckResult;
    queue: HealthCheckResult;
    cache: HealthCheckResult;
    external_services: HealthCheckResult;
  };
}

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  response_time_ms?: number;
  details?: any;
  error?: string;
}

// ========================================
// METRICS TYPES
// ========================================

export interface ServiceMetrics {
  service_name: string;
  timestamp: string;
  http_requests_total: number;
  http_request_duration_seconds: number;
  active_connections: number;
  memory_usage_bytes: number;
  cpu_usage_percent: number;
  custom_metrics?: Record<string, number>;
}

// ========================================
// ERROR TYPES
// ========================================

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly correlationId?: string;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
    correlationId?: string
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.correlationId = correlationId;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, correlationId?: string) {
    super(message, 400, 'VALIDATION_ERROR', true, correlationId);
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed', correlationId?: string) {
    super(message, 401, 'AUTHENTICATION_ERROR', true, correlationId);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied', correlationId?: string) {
    super(message, 403, 'AUTHORIZATION_ERROR', true, correlationId);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found', correlationId?: string) {
    super(message, 404, 'NOT_FOUND_ERROR', true, correlationId);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict', correlationId?: string) {
    super(message, 409, 'CONFLICT_ERROR', true, correlationId);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', correlationId?: string) {
    super(message, 429, 'RATE_LIMIT_ERROR', true, correlationId);
  }
}

export class ExternalServiceError extends AppError {
  constructor(message: string, correlationId?: string) {
    super(message, 502, 'EXTERNAL_SERVICE_ERROR', true, correlationId);
  }
}
