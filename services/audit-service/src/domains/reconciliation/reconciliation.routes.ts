import { Router, Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { jwtMiddleware, logger, AppError, HttpStatusCode } from '@eliteepay/shared';
import { ReconciliationService } from './reconciliation.service';

const router = Router();
const reconciliationService = new ReconciliationService();

interface ReconciliationRequest extends Request {
  correlationId: string;
  user?: {
    id: string;
    email: string;
    roles: string[];
    permissions: string[];
  };
}

// Authentication middleware for all reconciliation routes
router.use(jwtMiddleware.authenticate() as any);

// Run reconciliation validation
const runReconciliationValidation = [
  query('startDate')
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
  query('userId')
    .optional()
    .isUUID()
    .withMessage('User ID must be a valid UUID'),
  body('config.timeWindowMinutes')
    .optional()
    .isInt({ min: 1, max: 60 })
    .withMessage('Time window must be between 1 and 60 minutes'),
  body('config.amountTolerancePercent')
    .optional()
    .isFloat({ min: 0, max: 10 })
    .withMessage('Amount tolerance must be between 0 and 10 percent'),
  body('config.minimumMatchScore')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Minimum match score must be between 0 and 1'),
  body('config.autoMatchThreshold')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Auto match threshold must be between 0 and 1')
];

// Run reconciliation (admin only)
router.post('/run', 
  runReconciliationValidation,
  async (req: Request, res: Response) => {
    const reconciliationRequest = req as ReconciliationRequest;
    
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

      if (!reconciliationRequest.user) {
        throw new AppError('User not authenticated', HttpStatusCode.UNAUTHORIZED, 'NOT_AUTHENTICATED');
      }

      // Check admin permissions
      if (!reconciliationRequest.user.roles.includes('admin')) {
        throw new AppError(
          'Insufficient permissions',
          HttpStatusCode.FORBIDDEN,
          'INSUFFICIENT_PERMISSIONS'
        );
      }

      const { startDate, endDate, userId } = req.query;
      const { config } = req.body;

      if (!startDate || !endDate) {
        throw new AppError(
          'Start date and end date are required',
          HttpStatusCode.BAD_REQUEST,
          'MISSING_DATE_RANGE'
        );
      }

      const report = await reconciliationService.runReconciliation(
        startDate as string,
        endDate as string,
        userId as string | undefined,
        config
      );

      logger.info('Reconciliation completed successfully', {
        correlationId: reconciliationRequest.correlationId,
        userId: reconciliationRequest.user.id,
        reportId: report.id,
        matchRate: report.summary.matchRate
      });

      res.status(HttpStatusCode.CREATED).json({
        success: true,
        data: {
          reportId: report.id,
          summary: report.summary,
          correlationId: report.correlationId
        },
        error: null,
        meta: {
          correlationId: reconciliationRequest.correlationId,
          timestamp: new Date().toISOString(),
          service: 'audit-service'
        }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Run reconciliation failed', {
        correlationId: reconciliationRequest.correlationId,
        userId: reconciliationRequest.user?.id || 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError(
        'Failed to run reconciliation',
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        'RUN_RECONCILIATION_ERROR'
      );
    }
  }
);

// Create manual match validation
const createManualMatchValidation = [
  body('transactionId')
    .isUUID()
    .withMessage('Transaction ID must be a valid UUID'),
  body('logbookEntryId')
    .isUUID()
    .withMessage('Logbook entry ID must be a valid UUID'),
  body('notes')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('Notes must not exceed 500 characters')
];

// Create manual match (admin only)
router.post('/matches/manual', 
  createManualMatchValidation,
  async (req: Request, res: Response) => {
    const reconciliationRequest = req as ReconciliationRequest;
    
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

      if (!reconciliationRequest.user) {
        throw new AppError('User not authenticated', HttpStatusCode.UNAUTHORIZED, 'NOT_AUTHENTICATED');
      }

      // Check admin permissions
      if (!reconciliationRequest.user.roles.includes('admin')) {
        throw new AppError(
          'Insufficient permissions',
          HttpStatusCode.FORBIDDEN,
          'INSUFFICIENT_PERMISSIONS'
        );
      }

      const { transactionId, logbookEntryId, notes } = req.body;

      const match = await reconciliationService.createManualMatch(
        { transactionId, logbookEntryId, notes },
        reconciliationRequest.user.id
      );

      logger.info('Manual match created successfully', {
        correlationId: reconciliationRequest.correlationId,
        userId: reconciliationRequest.user.id,
        matchId: match.id,
        transactionId,
        logbookEntryId
      });

      res.status(HttpStatusCode.CREATED).json({
        success: true,
        data: {
          id: match.id,
          transactionId: match.transactionId,
          logbookEntryId: match.logbookEntryId,
          matchScore: match.matchScore,
          matchType: match.matchType,
          timeDifferenceMinutes: match.timeDifferenceMinutes,
          amountDifferenceMinor: match.amountDifferenceMinor,
          matchedAt: match.matchedAt,
          matchedBy: match.matchedBy,
          notes: match.notes
        },
        error: null,
        meta: {
          correlationId: reconciliationRequest.correlationId,
          timestamp: new Date().toISOString(),
          service: 'audit-service'
        }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Create manual match failed', {
        correlationId: reconciliationRequest.correlationId,
        userId: reconciliationRequest.user?.id || 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError(
        'Failed to create manual match',
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        'CREATE_MANUAL_MATCH_ERROR'
      );
    }
  }
);

// Get reconciliation report
router.get('/reports/:reportId', 
  param('reportId').isUUID().withMessage('Valid report ID is required'),
  async (req: Request, res: Response) => {
    const reconciliationRequest = req as ReconciliationRequest;
    
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

      if (!reconciliationRequest.user) {
        throw new AppError('User not authenticated', HttpStatusCode.UNAUTHORIZED, 'NOT_AUTHENTICATED');
      }

      const reportId = req.params.reportId;
      if (!reportId) {
        throw new AppError('Report ID is required', HttpStatusCode.BAD_REQUEST, 'MISSING_REPORT_ID');
      }

      const report = await reconciliationService.getReconciliationReport(reportId);

      if (!report) {
        throw new AppError(
          'Reconciliation report not found',
          HttpStatusCode.NOT_FOUND,
          'REPORT_NOT_FOUND'
        );
      }

      res.json({
        success: true,
        data: report,
        error: null,
        meta: {
          correlationId: reconciliationRequest.correlationId,
          timestamp: new Date().toISOString(),
          service: 'audit-service'
        }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Get reconciliation report failed', {
        correlationId: reconciliationRequest.correlationId,
        userId: reconciliationRequest.user?.id || 'unknown',
        reportId: req.params.reportId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError(
        'Failed to get reconciliation report',
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        'GET_REPORT_ERROR'
      );
    }
  }
);

// Get reconciliation metrics
router.get('/metrics', 
  query('startDate').isISO8601().withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate').isISO8601().withMessage('End date must be a valid ISO 8601 date'),
  query('userId').optional().isUUID().withMessage('User ID must be a valid UUID'),
  async (req: Request, res: Response) => {
    const reconciliationRequest = req as ReconciliationRequest;
    
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

      if (!reconciliationRequest.user) {
        throw new AppError('User not authenticated', HttpStatusCode.UNAUTHORIZED, 'NOT_AUTHENTICATED');
      }

      const { startDate, endDate, userId } = req.query;

      const metrics = await reconciliationService.getReconciliationMetrics(
        startDate as string,
        endDate as string,
        userId as string
      );

      res.json({
        success: true,
        data: metrics,
        error: null,
        meta: {
          correlationId: reconciliationRequest.correlationId,
          timestamp: new Date().toISOString(),
          service: 'audit-service'
        }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Get reconciliation metrics failed', {
        correlationId: reconciliationRequest.correlationId,
        userId: reconciliationRequest.user?.id || 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError(
        'Failed to get reconciliation metrics',
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        'GET_METRICS_ERROR'
      );
    }
  }
);

export { router as reconciliationRoutes };
