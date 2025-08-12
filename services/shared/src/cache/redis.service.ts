import { createClient, RedisClientType } from 'redis';
import { logger } from '../logging/logger';
import { AppError } from '../types';

export interface CacheConfig {
  url: string;
  password?: string;
  database?: number;
  keyPrefix?: string;
}

export class RedisService {
  private static instance: RedisService;
  private client: RedisClientType | null = null;
  private config: CacheConfig;
  private connected = false;

  private constructor(config: CacheConfig) {
    this.config = config;
  }

  public static getInstance(config?: CacheConfig): RedisService {
    if (!RedisService.instance) {
      if (!config) {
        throw new AppError('Redis configuration required for first initialization', 500, 'CONFIG_ERROR');
      }
      RedisService.instance = new RedisService(config);
    }
    return RedisService.instance;
  }

  public async connect(): Promise<void> {
    try {
      const clientConfig: any = {
        url: this.config.url,
        database: this.config.database || 0,
        socket: {
          connectTimeout: 10000,
          reconnectStrategy: (retries: number) => {
            if (retries > 10) {
              logger.error('Redis reconnection attempts exceeded');
              return false;
            }
            return Math.min(retries * 100, 3000);
          }
        }
      };

      if (this.config.password) {
        clientConfig.password = this.config.password;
      }

      this.client = createClient(clientConfig);

      // Set up event handlers
      this.client.on('error', (error: Error) => {
        logger.error('Redis client error', { error: error.message });
        this.connected = false;
      });

      this.client.on('connect', () => {
        logger.info('Redis client connected');
        this.connected = true;
      });

      this.client.on('disconnect', () => {
        logger.warn('Redis client disconnected');
        this.connected = false;
      });

      this.client.on('reconnecting', () => {
        logger.info('Redis client reconnecting');
      });

      // Connect to Redis
      await this.client.connect();

      // Test connection
      await this.client.ping();

      logger.info('Connected to Redis successfully', {
        url: this.config.url,
        database: this.config.database || 0
      });

    } catch (error) {
      logger.error('Failed to connect to Redis', {
        error: error instanceof Error ? error.message : 'Unknown error',
        url: this.config.url
      });
      throw new AppError('Redis connection failed', 500, 'REDIS_CONNECTION_ERROR');
    }
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.connected = false;
      logger.info('Disconnected from Redis');
    }
  }

  private getKey(key: string): string {
    return this.config.keyPrefix ? `${this.config.keyPrefix}:${key}` : key;
  }

  private ensureConnected(): void {
    if (!this.client || !this.connected) {
      throw new AppError('Redis client not connected', 500, 'REDIS_NOT_CONNECTED');
    }
  }

  public getClient(): RedisClientType {
    this.ensureConnected();
    return this.client!;
  }

  public async ping(): Promise<string> {
    this.ensureConnected();
    return await this.client!.ping();
  }

  // Basic operations
  public async get(key: string): Promise<string | null> {
    this.ensureConnected();
    try {
      return await this.client!.get(this.getKey(key));
    } catch (error) {
      logger.error('Redis GET operation failed', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new AppError('Cache read operation failed', 500, 'CACHE_READ_ERROR');
    }
  }

  public async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    this.ensureConnected();
    try {
      const options: any = {};
      if (ttlSeconds) {
        options.EX = ttlSeconds;
      }
      await this.client!.set(this.getKey(key), value, options);
    } catch (error) {
      logger.error('Redis SET operation failed', {
        key,
        ttlSeconds,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new AppError('Cache write operation failed', 500, 'CACHE_WRITE_ERROR');
    }
  }

  public async del(key: string): Promise<number> {
    this.ensureConnected();
    try {
      return await this.client!.del(this.getKey(key));
    } catch (error) {
      logger.error('Redis DEL operation failed', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new AppError('Cache delete operation failed', 500, 'CACHE_DELETE_ERROR');
    }
  }

  public async exists(key: string): Promise<boolean> {
    this.ensureConnected();
    try {
      const result = await this.client!.exists(this.getKey(key));
      return result === 1;
    } catch (error) {
      logger.error('Redis EXISTS operation failed', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return false;
    }
  }

  // JSON operations
  public async getJson<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) return null;
    
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Failed to parse JSON from cache', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  public async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      const jsonString = JSON.stringify(value);
      await this.set(key, jsonString, ttlSeconds);
    } catch (error) {
      logger.error('Failed to stringify JSON for cache', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new AppError('Cache JSON write operation failed', 500, 'CACHE_JSON_ERROR');
    }
  }

  // Hash operations
  public async hget(key: string, field: string): Promise<string | null> {
    this.ensureConnected();
    try {
      return await this.client!.hGet(this.getKey(key), field);
    } catch (error) {
      logger.error('Redis HGET operation failed', {
        key,
        field,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new AppError('Cache hash read operation failed', 500, 'CACHE_HASH_READ_ERROR');
    }
  }

  public async hset(key: string, field: string, value: string): Promise<void> {
    this.ensureConnected();
    try {
      await this.client!.hSet(this.getKey(key), field, value);
    } catch (error) {
      logger.error('Redis HSET operation failed', {
        key,
        field,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new AppError('Cache hash write operation failed', 500, 'CACHE_HASH_WRITE_ERROR');
    }
  }

  public async hdel(key: string, field: string): Promise<number> {
    this.ensureConnected();
    try {
      return await this.client!.hDel(this.getKey(key), field);
    } catch (error) {
      logger.error('Redis HDEL operation failed', {
        key,
        field,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new AppError('Cache hash delete operation failed', 500, 'CACHE_HASH_DELETE_ERROR');
    }
  }

  // Session management
  public async setSession(sessionId: string, sessionData: any, ttlSeconds: number = 1800): Promise<void> {
    await this.setJson(`session:${sessionId}`, sessionData, ttlSeconds);
  }

  public async getSession<T>(sessionId: string): Promise<T | null> {
    return await this.getJson<T>(`session:${sessionId}`);
  }

  public async deleteSession(sessionId: string): Promise<void> {
    await this.del(`session:${sessionId}`);
  }

  // Rate limiting
  public async incrementRateLimit(key: string, windowSeconds: number): Promise<number> {
    this.ensureConnected();
    try {
      const rateLimitKey = `rate_limit:${key}`;
      const current = await this.client!.incr(this.getKey(rateLimitKey));
      
      if (current === 1) {
        await this.client!.expire(this.getKey(rateLimitKey), windowSeconds);
      }
      
      return current;
    } catch (error) {
      logger.error('Redis rate limit operation failed', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new AppError('Rate limit operation failed', 500, 'RATE_LIMIT_ERROR');
    }
  }

  public async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      if (!this.connected || !this.client) {
        return {
          status: 'unhealthy',
          details: {
            connected: false,
            error: 'Client not connected'
          }
        };
      }

      const startTime = Date.now();
      await this.client.ping();
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        details: {
          connected: true,
          responseTime
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          connected: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }
}

// Factory function for easy initialization
export function createRedisService(): RedisService {
  const config: CacheConfig = {
    url: process.env.REDIS_URL!,
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'eliteepay'
  };

  if (!config.url) {
    throw new AppError('Missing required Redis configuration', 500, 'CONFIG_ERROR');
  }

  return RedisService.getInstance(config);
}

// Export singleton instance
export const redisService = createRedisService();
