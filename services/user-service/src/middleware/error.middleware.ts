import { Request, Response, NextFunction } from 'express';
import { AppError, logger, HttpStatusCode } from '@CalvaryPay/shared';

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
  logger.error('User service error', {
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
        service: 'user-service'
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
        service: 'user-service'
      }
    });
    return;
  }

  // Handle Supabase errors
  if (error.message.includes('duplicate key value violates unique constraint')) {
    res.status(HttpStatusCode.CONFLICT).json({
      success: false,
      data: null,
      error: {
        code: 'DUPLICATE_ENTRY',
        message: 'A user with this email already exists'
      },
      meta: {
        correlationId: req.correlationId,
        timestamp: new Date().toISOString(),
        service: 'user-service'
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
      service: 'user-service'
    }
  });
};
