import { z } from 'zod';

const configSchema = z.object({
  port: z.number().default(3004),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  corsOrigins: z.string().default('http://localhost:3000'),
  
  // Database
  supabaseUrl: z.string(),
  supabaseAnonKey: z.string(),
  supabaseServiceKey: z.string(),
  
  // Redis
  redisUrl: z.string().default('redis://localhost:6379'),
  
  // External APIs
  exchangeRateApiKey: z.string().optional(),
  fixerApiKey: z.string().optional(),
  
  // Rate limiting
  rateLimitWindowMs: z.number().default(15 * 60 * 1000), // 15 minutes
  rateLimitMaxRequests: z.number().default(100),
  
  // Caching
  priceCacheTtlSeconds: z.number().default(60), // 1 minute
  currencyRateCacheTtlSeconds: z.number().default(3600), // 1 hour
  
  // Logging
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info')
});

const rawConfig = {
  port: parseInt(process.env.PORT || '3004'),
  nodeEnv: process.env.NODE_ENV as 'development' | 'production' | 'test',
  corsOrigins: process.env.CORS_ORIGINS || 'http://localhost:3000',
  
  // Database
  supabaseUrl: process.env.SUPABASE_URL!,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY!,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  
  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // External APIs
  exchangeRateApiKey: process.env.EXCHANGE_RATE_API_KEY,
  fixerApiKey: process.env.FIXER_API_KEY,
  
  // Rate limiting
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  
  // Caching
  priceCacheTtlSeconds: parseInt(process.env.PRICE_CACHE_TTL_SECONDS || '60'),
  currencyRateCacheTtlSeconds: parseInt(process.env.CURRENCY_RATE_CACHE_TTL_SECONDS || '3600'),
  
  // Logging
  logLevel: process.env.LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug' || 'info'
};

export const config = configSchema.parse(rawConfig);

// Validate required environment variables
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY', 
  'SUPABASE_SERVICE_ROLE_KEY'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

console.log('Pricing Service Configuration loaded:', {
  port: config.port,
  nodeEnv: config.nodeEnv,
  logLevel: config.logLevel,
  priceCacheTtl: config.priceCacheTtlSeconds,
  currencyRateCacheTtl: config.currencyRateCacheTtlSeconds
});
