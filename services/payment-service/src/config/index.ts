import { ServiceConfig, Environment } from '@CalvaryPay/shared';

export interface PaymentServiceConfig extends ServiceConfig {
  paystack: {
    secretKey: string;
    publicKey: string;
    webhookSecret: string;
    baseUrl: string;
  };
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
  };
  redis: {
    url: string;
    password?: string;
  };
  idempotency: {
    ttlSeconds: number;
  };
  webhook: {
    retryAttempts: number;
    retryDelayMs: number;
  };
}

export const config: PaymentServiceConfig = {
  name: 'payment-service',
  version: process.env.npm_package_version || '1.0.0',
  environment: (process.env.NODE_ENV as Environment) || 'development',
  port: parseInt(process.env.PORT || '3002'),
  host: process.env.HOST || '0.0.0.0',
  logLevel: (process.env.LOG_LEVEL as any) || 'info',
  
  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY || '',
    publicKey: process.env.PAYSTACK_PUBLIC_KEY || '',
    webhookSecret: process.env.PAYSTACK_WEBHOOK_SECRET || '',
    baseUrl: process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co'
  },
  
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  },
  
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD })
  },
  
  idempotency: {
    ttlSeconds: parseInt(process.env.IDEMPOTENCY_TTL_SECONDS || '3600') // 1 hour
  },
  
  webhook: {
    retryAttempts: parseInt(process.env.WEBHOOK_RETRY_ATTEMPTS || '3'),
    retryDelayMs: parseInt(process.env.WEBHOOK_RETRY_DELAY_MS || '1000')
  }
};
