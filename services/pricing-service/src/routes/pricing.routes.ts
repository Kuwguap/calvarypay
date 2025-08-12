import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { jwtMiddleware, logger, AppError, HttpStatusCode } from '@eliteepay/shared';
import { PricingService } from '../services/pricing.service';

const router = Router();
const pricingService = new PricingService();

interface PricingRequest extends Request {
  correlationId: string;
  user?: {
    id: string;
    email: string;
    roles: string[];
    permissions: string[];
  };
}

// Authentication middleware for all pricing routes
router.use(jwtMiddleware.authenticate() as any);

// Create price validation
const createPriceValidation = [
  body('key')
    .isString()
    .isLength({ min: 1, max: 100 })
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage('Key must be alphanumeric with underscores and hyphens only'),
  body('name')
    .isString()
    .isLength({ min: 1, max: 255 })
    .withMessage('Name is required and must not exceed 255 characters'),
  body('description')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('currency')
    .isIn(['NGN', 'KES', 'GHS', 'ZAR', 'USD'])
    .withMessage('Currency must be one of: NGN, KES, GHS, ZAR, USD'),
  body('amount')
    .isFloat({ min: 0.01, max: 1000000 })
    .withMessage('Amount must be between 0.01 and 1,000,000'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  body('validFrom')
    .optional()
    .isISO8601()
    .withMessage('validFrom must be a valid ISO 8601 date'),
  body('validTo')
    .optional()
    .isISO8601()
    .withMessage('validTo must be a valid ISO 8601 date'),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object')
];

// Create price (admin only)
router.post('/prices', 
  createPriceValidation,
  async (req: Request, res: Response) => {
    const pricingRequest = req as PricingRequest;
    
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

      if (!pricingRequest.user) {
        throw new AppError('User not authenticated', HttpStatusCode.UNAUTHORIZED, 'NOT_AUTHENTICATED');
      }

      // Check admin permissions
      if (!pricingRequest.user.roles.includes('admin')) {
        throw new AppError(
          'Insufficient permissions',
          HttpStatusCode.FORBIDDEN,
          'INSUFFICIENT_PERMISSIONS'
        );
      }

      const { key, name, description, currency, amount, isActive, validFrom, validTo, metadata } = req.body;

      const price = await pricingService.createPrice({
        key,
        name,
        description,
        currency,
        amount,
        isActive,
        validFrom,
        validTo,
        metadata
      }, pricingRequest.user.id);

      logger.info('Price created successfully', {
        correlationId: pricingRequest.correlationId,
        userId: pricingRequest.user.id,
        priceKey: key,
        amount,
        currency
      });

      res.status(HttpStatusCode.CREATED).json({
        success: true,
        data: {
          id: price.id,
          key: price.key,
          name: price.name,
          description: price.description,
          currency: price.currency,
          amount: price.amountMinor / 100, // Convert back to major units
          isActive: price.isActive,
          validFrom: price.validFrom,
          validTo: price.validTo,
          metadata: price.metadata,
          createdAt: price.createdAt,
          updatedAt: price.updatedAt
        },
        error: null,
        meta: {
          correlationId: pricingRequest.correlationId,
          timestamp: new Date().toISOString(),
          service: 'pricing-service'
        }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Create price failed', {
        correlationId: pricingRequest.correlationId,
        userId: pricingRequest.user?.id || 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError(
        'Failed to create price',
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        'CREATE_PRICE_ERROR'
      );
    }
  }
);

// Get prices validation
const getPricesValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('currency')
    .optional()
    .isIn(['NGN', 'KES', 'GHS', 'ZAR', 'USD'])
    .withMessage('Currency must be one of: NGN, KES, GHS, ZAR, USD'),
  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  query('key')
    .optional()
    .isString()
    .withMessage('Key must be a string'),
  query('validAt')
    .optional()
    .isISO8601()
    .withMessage('validAt must be a valid ISO 8601 date')
];

// Get prices
router.get('/prices', 
  getPricesValidation,
  async (req: Request, res: Response) => {
    const pricingRequest = req as PricingRequest;
    
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

      if (!pricingRequest.user) {
        throw new AppError('User not authenticated', HttpStatusCode.UNAUTHORIZED, 'NOT_AUTHENTICATED');
      }

      const queryParams: any = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        sortBy: req.query.sortBy as string || 'created_at',
        sortOrder: ((req.query.sortOrder as string) === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc'
      };

      // Add optional filters only if they exist
      if (req.query.currency) queryParams.currency = req.query.currency;
      if (req.query.isActive !== undefined) {
        queryParams.isActive = req.query.isActive === 'true';
      }
      if (req.query.key) queryParams.key = req.query.key as string;
      if (req.query.validAt) queryParams.validAt = req.query.validAt as string;

      const result = await pricingService.getPrices(queryParams);

      // Convert amounts back to major units for response
      const responseItems = result.items.map(price => ({
        id: price.id,
        key: price.key,
        name: price.name,
        description: price.description,
        currency: price.currency,
        amount: price.amountMinor / 100,
        isActive: price.isActive,
        validFrom: price.validFrom,
        validTo: price.validTo,
        metadata: price.metadata,
        createdAt: price.createdAt,
        updatedAt: price.updatedAt,
        createdBy: price.createdBy
      }));

      res.json({
        success: true,
        data: {
          items: responseItems,
          pagination: result.pagination
        },
        error: null,
        meta: {
          correlationId: pricingRequest.correlationId,
          timestamp: new Date().toISOString(),
          service: 'pricing-service'
        }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Get prices failed', {
        correlationId: pricingRequest.correlationId,
        userId: pricingRequest.user?.id || 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError(
        'Failed to get prices',
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        'GET_PRICES_ERROR'
      );
    }
  }
);

// Get price by key
router.get('/prices/:key', 
  param('key').isString().withMessage('Valid price key is required'),
  async (req: Request, res: Response) => {
    const pricingRequest = req as PricingRequest;
    
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

      if (!pricingRequest.user) {
        throw new AppError('User not authenticated', HttpStatusCode.UNAUTHORIZED, 'NOT_AUTHENTICATED');
      }

      const priceKey = req.params.key;
      if (!priceKey) {
        throw new AppError('Price key is required', HttpStatusCode.BAD_REQUEST, 'MISSING_PRICE_KEY');
      }

      const price = await pricingService.getPriceByKey(priceKey);

      if (!price) {
        throw new AppError(
          'Price not found',
          HttpStatusCode.NOT_FOUND,
          'PRICE_NOT_FOUND'
        );
      }

      res.json({
        success: true,
        data: {
          id: price.id,
          key: price.key,
          name: price.name,
          description: price.description,
          currency: price.currency,
          amount: price.amountMinor / 100,
          isActive: price.isActive,
          validFrom: price.validFrom,
          validTo: price.validTo,
          metadata: price.metadata,
          createdAt: price.createdAt,
          updatedAt: price.updatedAt,
          createdBy: price.createdBy
        },
        error: null,
        meta: {
          correlationId: pricingRequest.correlationId,
          timestamp: new Date().toISOString(),
          service: 'pricing-service'
        }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Get price by key failed', {
        correlationId: pricingRequest.correlationId,
        userId: pricingRequest.user?.id || 'unknown',
        priceKey: req.params.key,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError(
        'Failed to get price',
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        'GET_PRICE_ERROR'
      );
    }
  }
);

export { router as pricingRoutes };
