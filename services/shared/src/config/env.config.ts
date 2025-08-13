/**
 * Environment Configuration
 * Loads and validates environment variables for all services
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
config({ path: resolve(process.cwd(), '.env') });

export interface EnvironmentConfig {
  // Server Configuration
  port: number;
  nodeEnv: string;
  
  // Supabase Configuration
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  
  // JWT Configuration
  jwtSecret: string;
  jwtExpiresIn: string;
  jwtRefreshExpiresIn: string;
  
  // Database Configuration
  databaseUrl: string;
  
  // Redis Configuration
  redisUrl: string;
  
  // Logging Configuration
  logLevel: string;
  logFileEnabled: boolean;
}

/**
 * Get environment variable with optional default value
 */
function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (!value && !defaultValue) {
    console.warn(`Environment variable ${key} is not set`);
    return '';
  }
  return value || defaultValue || '';
}

/**
 * Get environment variable as number
 */
function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Get environment variable as boolean
 */
function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true';
}

/**
 * Load and validate environment configuration
 */
export function loadEnvironmentConfig(): EnvironmentConfig {
  return {
    // Server Configuration
    port: getEnvNumber('PORT', 3000),
    nodeEnv: getEnvVar('NODE_ENV', 'development'),
    
    // Supabase Configuration
    supabaseUrl: getEnvVar('SUPABASE_URL', 'https://dummy-project.supabase.co'),
    supabaseAnonKey: getEnvVar('SUPABASE_ANON_KEY', 'dummy-anon-key'),
    supabaseServiceRoleKey: getEnvVar('SUPABASE_SERVICE_ROLE_KEY', 'dummy-service-role-key'),
    
    // JWT Configuration
    jwtSecret: getEnvVar('JWT_SECRET', 'CalvaryPay-jwt-secret-key-for-development-only'),
    jwtExpiresIn: getEnvVar('JWT_EXPIRES_IN', '15m'),
    jwtRefreshExpiresIn: getEnvVar('JWT_REFRESH_EXPIRES_IN', '7d'),
    
    // Database Configuration
    databaseUrl: getEnvVar('DATABASE_URL', 'postgresql://dummy:dummy@localhost:5432/CalvaryPay_dev'),
    
    // Redis Configuration
    redisUrl: getEnvVar('REDIS_URL', 'redis://localhost:6379'),
    
    // Logging Configuration
    logLevel: getEnvVar('LOG_LEVEL', 'info'),
    logFileEnabled: getEnvBoolean('LOG_FILE_ENABLED', true),
  };
}

// Export singleton instance
export const envConfig = loadEnvironmentConfig();

/**
 * Validate required environment variables for production
 */
export function validateProductionConfig(): void {
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY', 
    'SUPABASE_SERVICE_ROLE_KEY',
    'JWT_SECRET',
    'DATABASE_URL'
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0 && process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Initialize environment configuration
 */
export function initializeEnvironment(): void {
  // Load environment variables
  config({ path: resolve(process.cwd(), '.env') });
  
  // Validate production config if needed
  if (process.env.NODE_ENV === 'production') {
    validateProductionConfig();
  }
  
  console.log(`Environment initialized: ${envConfig.nodeEnv}`);
  console.log(`Server port: ${envConfig.port}`);
  console.log(`Log level: ${envConfig.logLevel}`);
}
