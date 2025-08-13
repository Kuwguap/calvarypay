import { Request, Response, NextFunction } from 'express';
import { logger, AppError, HttpStatusCode } from '@CalvaryPay/shared';
import { config } from '../config';
import crypto from 'crypto';

interface WebhookRequest extends Request {
  correlationId: string;
  body: Buffer;
}

export const webhookSignatureMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const webhookRequest = req as WebhookRequest;
  
  try {
    // Get signature from header
    const signature = req.get('x-paystack-signature');
    
    if (!signature) {
      logger.warn('Webhook signature missing', {
        correlationId: webhookRequest.correlationId,
        headers: req.headers
      });
      
      throw new AppError(
        'Webhook signature missing',
        HttpStatusCode.UNAUTHORIZED,
        'MISSING_SIGNATURE'
      );
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha512', config.paystack.webhookSecret)
      .update(webhookRequest.body)
      .digest('hex');

    if (signature !== expectedSignature) {
      logger.warn('Invalid webhook signature', {
        correlationId: webhookRequest.correlationId,
        receivedSignature: signature,
        expectedSignature
      });
      
      throw new AppError(
        'Invalid webhook signature',
        HttpStatusCode.UNAUTHORIZED,
        'INVALID_SIGNATURE'
      );
    }

    logger.debug('Webhook signature verified successfully', {
      correlationId: webhookRequest.correlationId
    });

    next();

  } catch (error) {
    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        data: null,
        error: {
          code: error.code,
          message: error.message
        },
        meta: {
          correlationId: webhookRequest.correlationId,
          timestamp: new Date().toISOString(),
          service: 'payment-service'
        }
      });
      return;
    }

    logger.error('Webhook signature verification failed', {
      correlationId: webhookRequest.correlationId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
      success: false,
      data: null,
      error: {
        code: 'SIGNATURE_VERIFICATION_ERROR',
        message: 'Webhook signature verification failed'
      },
      meta: {
        correlationId: webhookRequest.correlationId,
        timestamp: new Date().toISOString(),
        service: 'payment-service'
      }
    });
  }
};
