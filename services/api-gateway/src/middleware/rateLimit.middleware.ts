import rateLimit from 'express-rate-limit';
import { redisService, logger } from '@CalvaryPay/shared';
import { config } from '../config';

// Redis store for rate limiting
class RedisStore {
  private prefix: string = 'rl:';

  async increment(key: string): Promise<{ totalHits: number; timeToExpire?: number }> {
    try {
      const client = redisService.getClient();
      const fullKey = this.prefix + key;
      
      // Use individual Redis operations for simplicity
      const totalHits = await client.incr(fullKey);
      await client.expire(fullKey, Math.ceil(config.rateLimit.windowMs / 1000));
      const ttl = await client.ttl(fullKey);

      const result: { totalHits: number; timeToExpire?: number } = {
        totalHits
      };

      if (ttl > 0) {
        result.timeToExpire = ttl * 1000;
      }

      return result;
    } catch (error) {
      logger.error('Rate limit store error', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Fallback to allowing request if Redis fails
      return { totalHits: 1 };
    }
  }

  async decrement(key: string): Promise<void> {
    try {
      const client = redisService.getClient();
      const fullKey = this.prefix + key;
      await client.decr(fullKey);
    } catch (error) {
      logger.error('Rate limit decrement error', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  async resetKey(key: string): Promise<void> {
    try {
      const client = redisService.getClient();
      const fullKey = this.prefix + key;
      await client.del(fullKey);
    } catch (error) {
      logger.error('Rate limit reset error', {
        key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

const redisStore = new RedisStore();

// Key generator function
const keyGenerator = (req: any): string => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const userId = req.user?.id || 'anonymous';
  const path = req.route?.path || req.path || 'unknown';
  
  return `${ip}:${userId}:${path}`;
};

// Custom rate limit handler
const rateLimitHandler = async (req: any, res: any, next: any) => {
  try {
    const key = keyGenerator(req);
    const isAuthRoute = req.path.includes('/auth/');
    const maxRequests = isAuthRoute ? config.rateLimit.authMaxRequests : config.rateLimit.maxRequests;
    
    const result = await redisStore.increment(key);
    
    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - result.totalHits));
    res.setHeader('X-RateLimit-Reset', new Date(Date.now() + (result.timeToExpire || config.rateLimit.windowMs)));
    
    if (result.totalHits > maxRequests) {
      logger.warn('Rate limit exceeded', {
        correlationId: req.correlationId,
        key,
        totalHits: result.totalHits,
        maxRequests,
        ip: req.ip,
        path: req.path
      });
      
      return res.status(429).json({
        success: false,
        data: null,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later'
        },
        meta: {
          correlationId: req.correlationId,
          timestamp: new Date().toISOString(),
          service: 'api-gateway',
          retryAfter: Math.ceil((result.timeToExpire || config.rateLimit.windowMs) / 1000)
        }
      });
    }
    
    next();
  } catch (error) {
    logger.error('Rate limiting error', {
      correlationId: req.correlationId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    // Allow request to proceed if rate limiting fails
    next();
  }
};

export const rateLimitMiddleware = rateLimitHandler;
