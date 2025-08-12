import { Router, Request, Response } from 'express';
import { logger, AppError, HttpStatusCode } from '@eliteepay/shared';
import { WebhookService } from '../services/webhook.service';
import { webhookSignatureMiddleware } from '../middleware/webhook.middleware';

const router = Router();
const webhookService = new WebhookService();

interface WebhookRequest extends Request {
  correlationId: string;
  body: Buffer;
}

// Paystack webhook endpoint
router.post('/paystack', 
  webhookSignatureMiddleware,
  async (req: Request, res: Response) => {
    const webhookRequest = req as WebhookRequest;
    
    try {
      // Parse the webhook payload
      const payload = JSON.parse(webhookRequest.body.toString());
      
      logger.info('Paystack webhook received', {
        correlationId: webhookRequest.correlationId,
        event: payload.event,
        reference: payload.data?.reference
      });

      // Process the webhook
      await webhookService.processPaystackWebhook(payload);

      // Always respond with 200 OK to acknowledge receipt
      res.status(200).json({
        success: true,
        data: {
          message: 'Webhook processed successfully'
        },
        error: null,
        meta: {
          correlationId: webhookRequest.correlationId,
          timestamp: new Date().toISOString(),
          service: 'payment-service'
        }
      });

    } catch (error) {
      logger.error('Webhook processing failed', {
        correlationId: webhookRequest.correlationId,
        error: error instanceof Error ? error.message : 'Unknown error',
        body: webhookRequest.body.toString()
      });

      // Still return 200 to prevent webhook retries for processing errors
      res.status(200).json({
        success: false,
        data: null,
        error: {
          code: 'WEBHOOK_PROCESSING_ERROR',
          message: 'Webhook processing failed'
        },
        meta: {
          correlationId: webhookRequest.correlationId,
          timestamp: new Date().toISOString(),
          service: 'payment-service'
        }
      });
    }
  }
);

// Test webhook endpoint (development only)
if (process.env.NODE_ENV === 'development') {
  router.post('/test', async (req: Request, res: Response) => {
    const webhookRequest = req as WebhookRequest;
    
    try {
      logger.info('Test webhook received', {
        correlationId: webhookRequest.correlationId,
        body: req.body
      });

      res.json({
        success: true,
        data: {
          message: 'Test webhook received',
          body: req.body,
          headers: req.headers
        },
        error: null,
        meta: {
          correlationId: webhookRequest.correlationId,
          timestamp: new Date().toISOString(),
          service: 'payment-service'
        }
      });

    } catch (error) {
      logger.error('Test webhook failed', {
        correlationId: webhookRequest.correlationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        success: false,
        data: null,
        error: {
          code: 'TEST_WEBHOOK_ERROR',
          message: 'Test webhook failed'
        },
        meta: {
          correlationId: webhookRequest.correlationId,
          timestamp: new Date().toISOString(),
          service: 'payment-service'
        }
      });
    }
  });
}

export { router as webhookRoutes };
