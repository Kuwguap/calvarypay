import { ServiceConfig, Environment } from '@eliteepay/shared';

export interface GatewayConfig extends ServiceConfig {
  services: {
    userService: {
      url: string;
      timeout: number;
    };
    paymentService: {
      url: string;
      timeout: number;
    };
    auditService: {
      url: string;
      timeout: number;
    };
    pricingService: {
      url: string;
      timeout: number;
    };
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
    authMaxRequests: number;
  };
  redis: {
    url: string;
    password?: string;
  };
}

export const config: GatewayConfig = {
  name: 'api-gateway',
  version: process.env.npm_package_version || '1.0.0',
  environment: (process.env.NODE_ENV as Environment) || 'development',
  port: parseInt(process.env.PORT || '3000'),
  host: process.env.HOST || '0.0.0.0',
  logLevel: (process.env.LOG_LEVEL as any) || 'info',

  services: {
    userService: {
      url: process.env.USER_SERVICE_URL || 'http://localhost:3001',
      timeout: parseInt(process.env.USER_SERVICE_TIMEOUT || '60000') // 60 seconds for database operations
    },
    paymentService: {
      url: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3002',
      timeout: parseInt(process.env.PAYMENT_SERVICE_TIMEOUT || '60000')
    },
    auditService: {
      url: process.env.AUDIT_SERVICE_URL || 'http://localhost:3003',
      timeout: parseInt(process.env.AUDIT_SERVICE_TIMEOUT || '60000')
    },
    pricingService: {
      url: process.env.PRICING_SERVICE_URL || 'http://localhost:3004',
      timeout: parseInt(process.env.PRICING_SERVICE_TIMEOUT || '60000')
    }
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '300'),
    authMaxRequests: parseInt(process.env.RATE_LIMIT_AUTH_MAX_REQUESTS || '100')
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD })
  }
};