import { Request, Response, NextFunction } from 'express';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { logger, AppError } from '@CalvaryPay/shared';

export interface ProxyOptions {
  target: string;
  timeout: number;
  pathRewrite?: Record<string, string>;
  headers?: Record<string, string>;
  retries?: number;
  retryDelay?: number;
}

export interface ProxyRequest extends Request {
  correlationId: string;
  user?: {
    id: string;
    email: string;
    roles: string[];
    permissions: string[];
  };
}

export const proxyMiddleware = (options: ProxyOptions) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const proxyReq = req as ProxyRequest;
    try {
      const startTime = Date.now();

      // Build target URL
      let targetPath = proxyReq.originalUrl;

      // Apply path rewrites
      if (options.pathRewrite) {
        for (const [pattern, replacement] of Object.entries(options.pathRewrite)) {
          targetPath = targetPath.replace(new RegExp(pattern), replacement);
        }
      }

      const targetUrl = `${options.target}${targetPath}`;

      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': proxyReq.get('Content-Type') || 'application/json',
        'X-Correlation-ID': proxyReq.correlationId,
        'X-Forwarded-For': proxyReq.ip || 'unknown',
        'X-Forwarded-Proto': proxyReq.protocol,
        'X-Forwarded-Host': proxyReq.get('Host') || '',
        ...options.headers
      };

      // Add user context headers if authenticated
      if (proxyReq.user) {
        headers['X-User-ID'] = proxyReq.user.id;
        headers['X-User-Email'] = proxyReq.user.email;
        headers['X-User-Roles'] = proxyReq.user.roles.join(',');
      }

      // Copy authorization header
      if (proxyReq.get('Authorization')) {
        headers['Authorization'] = proxyReq.get('Authorization')!;
      }

      // Copy idempotency key if present
      if (proxyReq.get('Idempotency-Key')) {
        headers['Idempotency-Key'] = proxyReq.get('Idempotency-Key')!;
      }

      // Prepare axios config
      const axiosConfig: AxiosRequestConfig = {
        method: proxyReq.method as any,
        url: targetUrl,
        headers,
        timeout: options.timeout,
        data: proxyReq.body,
        params: proxyReq.query,
        validateStatus: () => true // Don't throw on HTTP error status codes
      };

      logger.debug('Proxying request', {
        correlationId: proxyReq.correlationId,
        method: proxyReq.method,
        originalUrl: proxyReq.originalUrl,
        targetUrl,
        userId: proxyReq.user?.id || 'anonymous'
      });

      // Make request with retries
      const response = await makeRequestWithRetries(axiosConfig, options.retries || 3, options.retryDelay || 1000);

      const duration = Date.now() - startTime;

      logger.info('Proxy request completed', {
        correlationId: proxyReq.correlationId,
        method: proxyReq.method,
        targetUrl,
        statusCode: response.status,
        duration,
        userId: proxyReq.user?.id || 'anonymous'
      });

      // Copy response headers (excluding hop-by-hop headers)
      const excludeHeaders = new Set([
        'connection',
        'keep-alive',
        'proxy-authenticate',
        'proxy-authorization',
        'te',
        'trailers',
        'transfer-encoding',
        'upgrade'
      ]);

      Object.entries(response.headers).forEach(([key, value]) => {
        if (!excludeHeaders.has(key.toLowerCase()) && value) {
          res.setHeader(key, Array.isArray(value) ? value.join(', ') : String(value));
        }
      });

      // Send response
      res.status(response.status).send(response.data);

    } catch (error) {
      logger.error('Proxy request failed', {
        correlationId: proxyReq.correlationId,
        method: proxyReq.method,
        originalUrl: proxyReq.originalUrl,
        target: options.target,
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: proxyReq.user?.id || 'anonymous'
      });

      if (error instanceof AppError) {
        next(error);
      } else {
        next(new AppError(
          'Proxy request failed',
          502,
          'PROXY_ERROR'
        ));
      }
    }
  };
};

// Helper function for retries
async function makeRequestWithRetries(
  config: AxiosRequestConfig,
  maxRetries: number,
  retryDelay: number
): Promise<AxiosResponse> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await axios(config);
    } catch (error) {
      lastError = error as Error;

      // Don't retry on client errors (4xx) or certain server errors
      if (axios.isAxiosError(error) && error.response) {
        const status = error.response.status;
        if (status >= 400 && status < 500 && status !== 429) {
          throw error;
        }
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        throw error;
      }

      // Wait before retry with exponential backoff
      const delay = retryDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));

      logger.warn('Retrying proxy request', {
        attempt,
        maxRetries,
        delay,
        url: config.url,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  throw lastError!;
}