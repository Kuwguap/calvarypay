import { Router, Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import multer from 'multer';
import { jwtMiddleware, logger, AppError, HttpStatusCode } from '@eliteepay/shared';
import { LogbookService } from './logbook.service';

const router = Router();
const logbookService = new LogbookService();

// Configure multer for photo uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

interface LogbookRequest extends Request {
  correlationId: string;
  user?: {
    id: string;
    email: string;
    roles: string[];
    permissions: string[];
  };
}

// Authentication middleware for all logbook routes
router.use(jwtMiddleware.authenticate() as any);

// Create logbook entry validation
const createEntryValidation = [
  body('type')
    .isIn(['fuel', 'cash', 'misc'])
    .withMessage('Type must be one of: fuel, cash, misc'),
  body('amount')
    .isFloat({ min: 0.01, max: 1000000 })
    .withMessage('Amount must be between 0.01 and 1,000,000'),
  body('currency')
    .isIn(['NGN', 'KES', 'GHS', 'ZAR', 'USD'])
    .withMessage('Currency must be one of: NGN, KES, GHS, ZAR, USD'),
  body('note')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Note must not exceed 500 characters'),
  body('location.lat')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('location.lng')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  body('clientId')
    .optional()
    .isString()
    .withMessage('Client ID must be a string')
];

// Create logbook entry
router.post('/entries', 
  upload.single('photo'),
  createEntryValidation,
  async (req: Request, res: Response) => {
    const logbookRequest = req as LogbookRequest;
    
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

      if (!logbookRequest.user) {
        throw new AppError('User not authenticated', HttpStatusCode.UNAUTHORIZED, 'NOT_AUTHENTICATED');
      }

      const { type, amount, currency, note, location, clientId } = req.body;

      // Parse location if provided
      let parsedLocation;
      if (location) {
        parsedLocation = typeof location === 'string' ? JSON.parse(location) : location;
      }

      const entry = await logbookService.createEntry(logbookRequest.user.id, {
        type,
        amount: parseFloat(amount),
        currency,
        ...(note && { note }),
        ...(req.file && { photo: req.file }),
        ...(parsedLocation && { location: parsedLocation }),
        ...(clientId && { clientId })
      });

      logger.info('Logbook entry created successfully', {
        correlationId: logbookRequest.correlationId,
        userId: logbookRequest.user.id,
        entryId: entry.id,
        type,
        amount,
        currency
      });

      res.status(HttpStatusCode.CREATED).json({
        success: true,
        data: {
          id: entry.id,
          type: entry.type,
          amount: entry.amountMinor / 100, // Convert back to major units
          currency: entry.currency,
          note: entry.note,
          photoUrl: entry.photoUrl,
          location: entry.location,
          isReconciled: entry.isReconciled,
          createdAt: entry.createdAt
        },
        error: null,
        meta: {
          correlationId: logbookRequest.correlationId,
          timestamp: new Date().toISOString(),
          service: 'payment-service'
        }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Create logbook entry failed', {
        correlationId: logbookRequest.correlationId,
        userId: logbookRequest.user?.id || 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError(
        'Failed to create logbook entry',
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        'CREATE_LOGBOOK_ENTRY_ERROR'
      );
    }
  }
);

// Get user logbook entries validation
const getEntriesValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('type')
    .optional()
    .isIn(['fuel', 'cash', 'misc'])
    .withMessage('Type must be one of: fuel, cash, misc'),
  query('currency')
    .optional()
    .isIn(['NGN', 'KES', 'GHS', 'ZAR', 'USD'])
    .withMessage('Currency must be one of: NGN, KES, GHS, ZAR, USD'),
  query('isReconciled')
    .optional()
    .isBoolean()
    .withMessage('isReconciled must be a boolean'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
];

// Get user logbook entries
router.get('/entries', 
  getEntriesValidation,
  async (req: Request, res: Response) => {
    const logbookRequest = req as LogbookRequest;
    
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

      if (!logbookRequest.user) {
        throw new AppError('User not authenticated', HttpStatusCode.UNAUTHORIZED, 'NOT_AUTHENTICATED');
      }

      const queryParams: any = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
        sortBy: req.query.sortBy as string || 'createdAt',
        sortOrder: ((req.query.sortOrder as string) === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc'
      };

      // Add optional filters only if they exist
      if (req.query.type) queryParams.type = req.query.type;
      if (req.query.currency) queryParams.currency = req.query.currency;
      if (req.query.isReconciled !== undefined) {
        queryParams.isReconciled = req.query.isReconciled === 'true';
      }
      if (req.query.startDate) queryParams.startDate = req.query.startDate as string;
      if (req.query.endDate) queryParams.endDate = req.query.endDate as string;

      const result = await logbookService.getUserEntries(logbookRequest.user.id, queryParams);

      // Convert amounts back to major units for response
      const responseItems = result.items.map(entry => ({
        id: entry.id,
        type: entry.type,
        amount: entry.amountMinor / 100,
        currency: entry.currency,
        note: entry.note,
        photoUrl: entry.photoUrl,
        location: entry.location,
        isReconciled: entry.isReconciled,
        reconciledTransactionId: entry.reconciledTransactionId,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt
      }));

      res.json({
        success: true,
        data: {
          items: responseItems,
          pagination: result.pagination
        },
        error: null,
        meta: {
          correlationId: logbookRequest.correlationId,
          timestamp: new Date().toISOString(),
          service: 'payment-service'
        }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Get logbook entries failed', {
        correlationId: logbookRequest.correlationId,
        userId: logbookRequest.user?.id || 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError(
        'Failed to get logbook entries',
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        'GET_LOGBOOK_ENTRIES_ERROR'
      );
    }
  }
);

// Get logbook entry by ID
router.get('/entries/:id', 
  param('id').isUUID().withMessage('Valid entry ID is required'),
  async (req: Request, res: Response) => {
    const logbookRequest = req as LogbookRequest;
    
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

      if (!logbookRequest.user) {
        throw new AppError('User not authenticated', HttpStatusCode.UNAUTHORIZED, 'NOT_AUTHENTICATED');
      }

      const entryId = req.params.id;
      if (!entryId) {
        throw new AppError('Entry ID is required', HttpStatusCode.BAD_REQUEST, 'MISSING_ENTRY_ID');
      }

      const entry = await logbookService.getEntryById(entryId, logbookRequest.user.id);

      res.json({
        success: true,
        data: {
          id: entry.id,
          type: entry.type,
          amount: entry.amountMinor / 100,
          currency: entry.currency,
          note: entry.note,
          photoUrl: entry.photoUrl,
          location: entry.location,
          isReconciled: entry.isReconciled,
          reconciledTransactionId: entry.reconciledTransactionId,
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt
        },
        error: null,
        meta: {
          correlationId: logbookRequest.correlationId,
          timestamp: new Date().toISOString(),
          service: 'payment-service'
        }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Get logbook entry by ID failed', {
        correlationId: logbookRequest.correlationId,
        userId: logbookRequest.user?.id || 'unknown',
        entryId: req.params.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError(
        'Failed to get logbook entry',
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        'GET_LOGBOOK_ENTRY_ERROR'
      );
    }
  }
);

// Offline sync endpoint
router.post('/sync', async (req: Request, res: Response) => {
  const logbookRequest = req as LogbookRequest;
  
  try {
    if (!logbookRequest.user) {
      throw new AppError('User not authenticated', HttpStatusCode.UNAUTHORIZED, 'NOT_AUTHENTICATED');
    }

    const { entries } = req.body;

    if (!Array.isArray(entries)) {
      throw new AppError(
        'Entries must be an array',
        HttpStatusCode.BAD_REQUEST,
        'INVALID_ENTRIES_FORMAT'
      );
    }

    const result = await logbookService.syncOfflineEntries(logbookRequest.user.id, { entries });

    res.json({
      success: true,
      data: result,
      error: null,
      meta: {
        correlationId: logbookRequest.correlationId,
        timestamp: new Date().toISOString(),
        service: 'payment-service'
      }
    });

  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    logger.error('Offline sync failed', {
      correlationId: logbookRequest.correlationId,
      userId: logbookRequest.user?.id || 'unknown',
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    throw new AppError(
      'Failed to sync offline entries',
      HttpStatusCode.INTERNAL_SERVER_ERROR,
      'OFFLINE_SYNC_ERROR'
    );
  }
});

export { router as logbookRoutes };
