import { ServiceConfig, Environment } from '@CalvaryPay/shared';

export interface UserServiceConfig extends ServiceConfig {
  jwt: {
    secret: string;
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
    issuer: string;
    audience: string;
  };
  bcrypt: {
    saltRounds: number;
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
  email: {
    enabled: boolean;
    provider?: string;
    apiKey?: string;
  };
}

export const config: UserServiceConfig = {
  name: 'user-service',
  version: process.env.npm_package_version || '1.0.0',
  environment: (process.env.NODE_ENV as Environment) || 'development',
  port: parseInt(process.env.PORT || '3001'),
  host: process.env.HOST || '0.0.0.0',
  logLevel: (process.env.LOG_LEVEL as any) || 'info',
  
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    accessTokenExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshTokenExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
    issuer: process.env.JWT_ISSUER || 'CalvaryPay-user-service',
    audience: process.env.JWT_AUDIENCE || 'CalvaryPay-api'
  },
  
  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12')
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
  
  email: {
    enabled: process.env.EMAIL_ENABLED === 'true',
    ...(process.env.EMAIL_PROVIDER && { provider: process.env.EMAIL_PROVIDER }),
    ...(process.env.EMAIL_API_KEY && { apiKey: process.env.EMAIL_API_KEY })
  }
};
