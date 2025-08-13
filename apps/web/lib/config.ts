/**
 * CalvaryPay Frontend Configuration
 * Centralized configuration management for the frontend application
 */

export const config = {
  // API Configuration
  api: {
    // Use API Gateway for all requests
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api',
    gatewayUrl: process.env.NEXT_PUBLIC_API_GATEWAY_URL || 'http://localhost:3000',
    timeout: 60000, // 60 seconds for database operations
  },

  // Supabase Configuration
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  },

  // Application Configuration
  app: {
    name: process.env.NEXT_PUBLIC_APP_NAME || 'CalvaryPay',
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    environment: process.env.NEXT_PUBLIC_ENVIRONMENT || 'development',
  },

  // Authentication Configuration
  auth: {
    tokenKey: 'CalvaryPay_token',
    refreshTokenKey: 'CalvaryPay_refresh_token',
    userKey: 'CalvaryPay_user',
    sessionTimeout: 30 * 60 * 1000, // 30 minutes
  },

  // Feature Flags
  features: {
    offlineMode: process.env.NEXT_PUBLIC_ENABLE_OFFLINE_MODE === 'true',
    realtimeUpdates: process.env.NEXT_PUBLIC_ENABLE_REALTIME_UPDATES === 'true',
    analytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
  },

  // Payment Configuration
  payment: {
    paystackPublicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '',
  },

  // Offline Configuration
  offline: {
    dbName: 'CalvaryPay_offline',
    dbVersion: 1,
    syncInterval: 30000, // 30 seconds
    maxRetries: 3,
  },

  // UI Configuration
  ui: {
    defaultPageSize: 20,
    maxPageSize: 100,
    debounceDelay: 300,
    toastDuration: 5000,
  },

  // Logging Configuration
  logging: {
    level: process.env.NEXT_PUBLIC_LOG_LEVEL || 'info',
    enableDebug: process.env.NEXT_PUBLIC_ENABLE_DEBUG === 'true',
  },

  // Validation Rules
  validation: {
    password: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
    },
    file: {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
    },
  },

  // Routes Configuration
  routes: {
    public: {
      home: '/',
      login: '/auth/signin',
      signup: '/auth/signup',
      forgotPassword: '/auth/forgot-password',
    },
    dashboard: {
      customer: '/dashboard/customer',
      merchant: '/dashboard/company',
      admin: '/dashboard/admin',
      employee: '/dashboard/employee',
    },
    features: {
      payments: '/dashboard/payments',
      transactions: '/dashboard/transactions',
      logbook: '/dashboard/logbook',
      pricing: '/dashboard/pricing',
      reconciliation: '/dashboard/reconciliation',
    },
  },
} as const;

// Type definitions for configuration
export type Config = typeof config;
export type ApiConfig = typeof config.api;
export type AuthConfig = typeof config.auth;
export type FeatureFlags = typeof config.features;
