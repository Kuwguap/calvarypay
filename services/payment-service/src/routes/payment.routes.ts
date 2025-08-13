import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { jwtMiddleware, logger, AppError, HttpStatusCode } from '@CalvaryPay/shared';
import { PaymentService } from '../services/payment.service';
import { idempotencyMiddleware } from '../middleware/idempotency.middleware';

const router = Router();
const paymentService = new PaymentService();

interface PaymentRequest extends Request {
  correlationId: string;
  user?: {
    id: string;
    email: string;
    roles: string[];
    permissions: string[];
  };
}

// Authentication middleware for all payment routes
router.use(jwtMiddleware.authenticate() as any);

// Initiate payment validation
const initiatePaymentValidation = [
  body('amount')
    .isInt({ min: 1 })
    .withMessage('Amount must be a positive integer in kobo/cents'),
  body('currency')
    .isIn(['NGN', 'KES', 'GHS', 'ZAR', 'USD'])
    .withMessage('Currency must be one of: NGN, KES, GHS, ZAR, USD'),
  body('channel')
    .optional()
    .isIn(['card', 'bank', 'mobile_money', 'ussd'])
    .withMessage('Channel must be one of: card, bank, mobile_money, ussd'),
  body('description')
    .optional()
    .isLength({ max: 255 })
    .withMessage('Description must not exceed 255 characters'),
  body('callbackUrl')
    .optional()
    .isURL()
    .withMessage('Callback URL must be a valid URL'),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object')
];

// Initiate payment
router.post('/initiate',
  idempotencyMiddleware,
  initiatePaymentValidation,
  async (req: Request, res: Response) => {
    const paymentRequest = req as PaymentRequest;

    try {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(
          'Validation failed',
          HttpStatusCode.BAD_REQUEST,
          'VALIDATION_ERROR'
        );
      }

      if (!paymentRequest.user) {
        throw new AppError('User not authenticated', HttpStatusCode.UNAUTHORIZED, 'NOT_AUTHENTICATED');
      }

      const { amount, currency, channel, description, callbackUrl, metadata } = req.body;

      // Extract idempotency key from headers
      const idempotencyKey = req.headers['idempotency-key'] as string;

      const result = await paymentService.initiatePaymentWithIdempotency({
        userId: paymentRequest.user.id,
        amount,
        currency,
        channel,
        description,
        callbackUrl,
        metadata
      }, idempotencyKey);

      logger.info('Payment initiated successfully', {
        correlationId: paymentRequest.correlationId,
        userId: paymentRequest.user.id,
        reference: result.reference,
        amount,
        currency
      });

      res.status(HttpStatusCode.CREATED).json({
        success: true,
        data: result,
        error: null,
        meta: {
          correlationId: paymentRequest.correlationId,
          timestamp: new Date().toISOString(),
          service: 'payment-service'
        }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Payment initiation failed', {
        correlationId: paymentRequest.correlationId,
        userId: paymentRequest.user?.id || 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError(
        'Payment initiation failed',
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        'PAYMENT_INITIATION_ERROR'
      );
    }
  }
);

// Get payment by reference
router.get('/reference/:reference', 
  param('reference').notEmpty().withMessage('Payment reference is required'),
  async (req: Request, res: Response) => {
    const paymentRequest = req as PaymentRequest;
    
    try {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(
          'Validation failed',
          HttpStatusCode.BAD_REQUEST,
          'VALIDATION_ERROR'
        );
      }

      if (!paymentRequest.user) {
        throw new AppError('User not authenticated', HttpStatusCode.UNAUTHORIZED, 'NOT_AUTHENTICATED');
      }

      const reference = req.params.reference;
      if (!reference) {
        throw new AppError('Payment reference is required', HttpStatusCode.BAD_REQUEST, 'MISSING_REFERENCE');
      }

      const transaction = await paymentService.getTransactionByReference(reference);

      // Check if user owns this transaction or is admin
      if (transaction.userId !== paymentRequest.user.id && !paymentRequest.user.roles.includes('admin')) {
        throw new AppError(
          'Access denied',
          HttpStatusCode.FORBIDDEN,
          'ACCESS_DENIED'
        );
      }

      res.json({
        success: true,
        data: transaction,
        error: null,
        meta: {
          correlationId: paymentRequest.correlationId,
          timestamp: new Date().toISOString(),
          service: 'payment-service'
        }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Get payment by reference failed', {
        correlationId: paymentRequest.correlationId,
        userId: paymentRequest.user?.id || 'unknown',
        reference: req.params.reference,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError(
        'Failed to get payment',
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        'GET_PAYMENT_ERROR'
      );
    }
  }
);

// Get user transactions
const getUserTransactionsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['pending', 'processing', 'success', 'failed', 'cancelled'])
    .withMessage('Status must be one of: pending, processing, success, failed, cancelled'),
  query('currency')
    .optional()
    .isIn(['NGN', 'KES', 'GHS', 'ZAR', 'USD'])
    .withMessage('Currency must be one of: NGN, KES, GHS, ZAR, USD')
];

router.get('/transactions', 
  getUserTransactionsValidation,
  async (req: Request, res: Response) => {
    const paymentRequest = req as PaymentRequest;
    
    try {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(
          'Validation failed',
          HttpStatusCode.BAD_REQUEST,
          'VALIDATION_ERROR'
        );
      }

      if (!paymentRequest.user) {
        throw new AppError('User not authenticated', HttpStatusCode.UNAUTHORIZED, 'NOT_AUTHENTICATED');
      }

      const query = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        status: req.query.status as string,
        currency: req.query.currency as string,
        sortBy: req.query.sortBy as string || 'createdAt',
        sortOrder: ((req.query.sortOrder as string) === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc'
      };

      const result = await paymentService.getUserTransactions(paymentRequest.user.id, query);

      res.json({
        success: true,
        data: result,
        error: null,
        meta: {
          correlationId: paymentRequest.correlationId,
          timestamp: new Date().toISOString(),
          service: 'payment-service'
        }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Get user transactions failed', {
        correlationId: paymentRequest.correlationId,
        userId: paymentRequest.user?.id || 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError(
        'Failed to get transactions',
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        'GET_TRANSACTIONS_ERROR'
      );
    }
  }
);

// Verify payment
router.post('/verify/:reference',
  param('reference').notEmpty().withMessage('Payment reference is required'),
  async (req: Request, res: Response) => {
    const paymentRequest = req as PaymentRequest;
    
    try {
      // Check validation results
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        throw new AppError(
          'Validation failed',
          HttpStatusCode.BAD_REQUEST,
          'VALIDATION_ERROR'
        );
      }

      if (!paymentRequest.user) {
        throw new AppError('User not authenticated', HttpStatusCode.UNAUTHORIZED, 'NOT_AUTHENTICATED');
      }

      const reference = req.params.reference;
      if (!reference) {
        throw new AppError('Payment reference is required', HttpStatusCode.BAD_REQUEST, 'MISSING_REFERENCE');
      }

      const result = await paymentService.verifyPayment(reference);

      logger.info('Payment verified', {
        correlationId: paymentRequest.correlationId,
        userId: paymentRequest.user.id,
        reference,
        status: result.status
      });

      res.json({
        success: true,
        data: result,
        error: null,
        meta: {
          correlationId: paymentRequest.correlationId,
          timestamp: new Date().toISOString(),
          service: 'payment-service'
        }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Payment verification failed', {
        correlationId: paymentRequest.correlationId,
        userId: paymentRequest.user?.id || 'unknown',
        reference: req.params.reference,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError(
        'Payment verification failed',
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        'PAYMENT_VERIFICATION_ERROR'
      );
    }
  }
);

export { router as paymentRoutes };
