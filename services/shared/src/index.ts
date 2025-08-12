// EliteEpay Shared Library - Main Export File
// This file exports all shared components for use across microservices

// Configuration
export {
  loadEnvironmentConfig,
  envConfig,
  initializeEnvironment,
  validateProductionConfig
} from './config/env.config';
export type { EnvironmentConfig } from './config/env.config';

// Types
export * from './types';

// Database
export { SupabaseService, supabaseService, createSupabaseService } from './database/supabase.service';
export type { DatabaseConfig } from './database/supabase.service';

// Cache
export { RedisService, redisService, createRedisService } from './cache/redis.service';
export type { CacheConfig } from './cache/redis.service';

// Logging
export { logger, Logger } from './logging/logger';
export type { LogContext } from './logging/logger';

// Authentication
export { jwtMiddleware, JWTMiddleware } from './auth/jwt.middleware';
export type { AuthenticatedRequest, JWTConfig } from './auth/jwt.middleware';

// Queue (will be added)
// export { rabbitMQService, RabbitMQService } from './queue/rabbitmq.service';

// Email (will be added)
// export { emailService, EmailService } from './notifications/email.service';

// Validation (will be added)
// export { validateRequest } from './validation/request.validator';

// Metrics (will be added)
// export { metricsService } from './metrics/prometheus.service';

// Health Check (will be added)
// export { healthCheckService } from './health/health.service';
