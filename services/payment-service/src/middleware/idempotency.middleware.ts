import { Request, Response, NextFunction } from 'express';
import { redisService, logger, AppError, HttpStatusCode } from '@eliteepay/shared';
import { config } from '../config';
import crypto from 'crypto';

interface IdempotencyRequest extends Request {
  correlationId: string;
  user?: {
    id: string;
    email: string;
    roles: string[];
    permissions: string[];
  };
}

export const idempotencyMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const idempotencyRequest = req as IdempotencyRequest;
  
  try {
    // Get idempotency key from header
    const idempotencyKey = req.get('Idempotency-Key');
    
    if (!idempotencyKey) {
      // Generate idempotency key based on request content if not provided
      const requestSignature = crypto
        .createHash('sha256')
        .update(JSON.stringify({
          method: req.method,
          url: req.originalUrl,
          body: req.body,
          userId: idempotencyRequest.user?.id
        }))
        .digest('hex');
      
      req.headers['idempotency-key'] = requestSignature;
    }

    const finalIdempotencyKey = req.get('Idempotency-Key')!;
    const cacheKey = `idempotency:${finalIdempotencyKey}`;

    // Check if this request has been processed before
    const cachedResponse = await redisService.get(cacheKey);
    
    if (cachedResponse) {
      logger.info('Returning cached idempotent response', {
        correlationId: idempotencyRequest.correlationId,
        idempotencyKey: finalIdempotencyKey,
        userId: idempotencyRequest.user?.id || 'unknown'
      });

      // Parse and return cached response
      const parsedResponse = JSON.parse(cachedResponse);
      res.status(parsedResponse.statusCode).json(parsedResponse.body);
      return;
    }

    // Store original res.json to intercept response
    const originalJson = res.json.bind(res);
    const originalStatus = res.status.bind(res);
    let statusCode = 200;

    // Override res.status to capture status code
    res.status = function(code: number) {
      statusCode = code;
      return originalStatus(code);
    };

    // Override res.json to cache successful responses
    res.json = function(body: any) {
      // Only cache successful responses (2xx status codes)
      if (statusCode >= 200 && statusCode < 300) {
        const responseToCache = {
          statusCode,
          body
        };

        // Cache the response asynchronously
        redisService.set(
          cacheKey,
          JSON.stringify(responseToCache),
          config.idempotency.ttlSeconds
        ).catch((error) => {
          logger.error('Failed to cache idempotent response', {
            correlationId: idempotencyRequest.correlationId,
            idempotencyKey: finalIdempotencyKey,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        });

        logger.debug('Cached idempotent response', {
          correlationId: idempotencyRequest.correlationId,
          idempotencyKey: finalIdempotencyKey,
          statusCode,
          userId: idempotencyRequest.user?.id || 'unknown'
        });
      }

      return originalJson(body);
    };

    next();

  } catch (error) {
    logger.error('Idempotency middleware error', {
      correlationId: idempotencyRequest.correlationId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    // Continue without idempotency if Redis fails
    next();
  }
};
