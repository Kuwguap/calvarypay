import { Request, Response, NextFunction } from 'express';
import { AppError, logger, HttpStatusCode } from '@eliteepay/shared';

export interface ErrorRequest extends Request {
  correlationId: string;
}

export const errorHandler = (
  error: Error,
  req: ErrorRequest,
  res: Response,
  next: NextFunction
): void => {
  // Log the error
  logger.error('Request error', {
    correlationId: req.correlationId,
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Handle known AppError instances
  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      data: null,
      error: {
        code: error.code,
        message: error.message
      },
      meta: {
        correlationId: req.correlationId,
        timestamp: new Date().toISOString(),
        service: 'api-gateway'
      }
    });
    return;
  }

  // Handle validation errors
  if (error.name === 'ValidationError') {
    res.status(HttpStatusCode.BAD_REQUEST).json({
      success: false,
      data: null,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: error.message
      },
      meta: {
        correlationId: req.correlationId,
        timestamp: new Date().toISOString(),
        service: 'api-gateway'
      }
    });
    return;
  }

  // Handle JSON parsing errors
  if (error instanceof SyntaxError && 'body' in error) {
    res.status(HttpStatusCode.BAD_REQUEST).json({
      success: false,
      data: null,
      error: {
        code: 'INVALID_JSON',
        message: 'Invalid JSON in request body'
      },
      meta: {
        correlationId: req.correlationId,
        timestamp: new Date().toISOString(),
        service: 'api-gateway'
      }
    });
    return;
  }

  // Handle timeout errors
  if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
    res.status(HttpStatusCode.GATEWAY_TIMEOUT).json({
      success: false,
      data: null,
      error: {
        code: 'GATEWAY_TIMEOUT',
        message: 'Request timeout - service did not respond in time'
      },
      meta: {
        correlationId: req.correlationId,
        timestamp: new Date().toISOString(),
        service: 'api-gateway'
      }
    });
    return;
  }

  // Handle connection errors
  if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
    res.status(HttpStatusCode.BAD_GATEWAY).json({
      success: false,
      data: null,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Downstream service is currently unavailable'
      },
      meta: {
        correlationId: req.correlationId,
        timestamp: new Date().toISOString(),
        service: 'api-gateway'
      }
    });
    return;
  }

  // Default error response
  res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
    success: false,
    data: null,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'development' 
        ? error.message 
        : 'An internal error occurred'
    },
    meta: {
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
      service: 'api-gateway'
    }
  });
};
