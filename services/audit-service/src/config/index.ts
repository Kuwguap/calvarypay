import { ServiceConfig, Environment } from '@CalvaryPay/shared';

export interface AuditServiceConfig extends ServiceConfig {
  supabase: {
    url: string;
    anonKey: string;
    serviceRoleKey: string;
  };
  redis: {
    url: string;
    password?: string;
  };
  audit: {
    retentionDays: number;
    batchSize: number;
    flushIntervalMs: number;
  };
  hmac: {
    secret: string;
    algorithm: string;
  };
}

export const config: AuditServiceConfig = {
  name: 'audit-service',
  version: process.env.npm_package_version || '1.0.0',
  environment: (process.env.NODE_ENV as Environment) || 'development',
  port: parseInt(process.env.PORT || '3003'),
  host: process.env.HOST || '0.0.0.0',
  logLevel: (process.env.LOG_LEVEL as any) || 'info',
  
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  },
  
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    ...(process.env.REDIS_PASSWORD && { password: process.env.REDIS_PASSWORD })
  },
  
  audit: {
    retentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS || '2555'), // ~7 years
    batchSize: parseInt(process.env.AUDIT_BATCH_SIZE || '100'),
    flushIntervalMs: parseInt(process.env.AUDIT_FLUSH_INTERVAL_MS || '5000') // 5 seconds
  },
  
  hmac: {
    secret: process.env.AUDIT_HMAC_SECRET || 'your-audit-hmac-secret-change-in-production',
    algorithm: process.env.AUDIT_HMAC_ALGORITHM || 'sha256'
  }
};
