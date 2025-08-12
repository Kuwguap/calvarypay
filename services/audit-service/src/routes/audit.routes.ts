import { Router, Request, Response } from 'express';
import { query, param, validationResult } from 'express-validator';
import { jwtMiddleware, logger, AppError, HttpStatusCode } from '@eliteepay/shared';
import { AuditService } from '../services/audit.service';

const router = Router();
const auditService = new AuditService();

interface AuditRequest extends Request {
  correlationId: string;
  user?: {
    id: string;
    email: string;
    roles: string[];
    permissions: string[];
  };
}

// Authentication and authorization middleware
router.use(jwtMiddleware.authenticate() as any);
router.use(jwtMiddleware.requireRole(['admin', 'auditor']) as any);

// Get audit logs with filtering
const getAuditLogsValidation = [
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
    .isString()
    .withMessage('Type must be a string'),
  query('actorUserId')
    .optional()
    .isUUID()
    .withMessage('Actor user ID must be a valid UUID'),
  query('correlationId')
    .optional()
    .isString()
    .withMessage('Correlation ID must be a string'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
];

router.get('/logs', getAuditLogsValidation, async (req: Request, res: Response) => {
  const auditRequest = req as AuditRequest;
  
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

    const query = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20,
      type: req.query.type as string,
      actorUserId: req.query.actorUserId as string,
      correlationId: req.query.correlationId as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      sortBy: req.query.sortBy as string || 'eventTime',
      sortOrder: ((req.query.sortOrder as string) === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc'
    };

    const result = await auditService.getAuditLogs(query);

    logger.info('Audit logs retrieved', {
      correlationId: auditRequest.correlationId,
      userId: auditRequest.user?.id || 'unknown',
      query,
      resultCount: result.items.length
    });

    res.json({
      success: true,
      data: result,
      error: null,
      meta: {
        correlationId: auditRequest.correlationId,
        timestamp: new Date().toISOString(),
        service: 'audit-service'
      }
    });

  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    logger.error('Get audit logs failed', {
      correlationId: auditRequest.correlationId,
      userId: auditRequest.user?.id || 'unknown',
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    throw new AppError(
      'Failed to get audit logs',
      HttpStatusCode.INTERNAL_SERVER_ERROR,
      'GET_AUDIT_LOGS_ERROR'
    );
  }
});

// Get audit log by ID
router.get('/logs/:id', 
  param('id').notEmpty().withMessage('Audit log ID is required'),
  async (req: Request, res: Response) => {
    const auditRequest = req as AuditRequest;
    
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

      const logId = req.params.id;
      if (!logId) {
        throw new AppError('Audit log ID is required', HttpStatusCode.BAD_REQUEST, 'MISSING_LOG_ID');
      }

      const auditLog = await auditService.getAuditLogById(logId);

      res.json({
        success: true,
        data: auditLog,
        error: null,
        meta: {
          correlationId: auditRequest.correlationId,
          timestamp: new Date().toISOString(),
          service: 'audit-service'
        }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Get audit log by ID failed', {
        correlationId: auditRequest.correlationId,
        userId: auditRequest.user?.id || 'unknown',
        logId: req.params.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError(
        'Failed to get audit log',
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        'GET_AUDIT_LOG_ERROR'
      );
    }
  }
);

// Get audit statistics
router.get('/stats', async (req: Request, res: Response) => {
  const auditRequest = req as AuditRequest;
  
  try {
    const stats = await auditService.getAuditStatistics();

    res.json({
      success: true,
      data: stats,
      error: null,
      meta: {
        correlationId: auditRequest.correlationId,
        timestamp: new Date().toISOString(),
        service: 'audit-service'
      }
    });

  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    logger.error('Get audit statistics failed', {
      correlationId: auditRequest.correlationId,
      userId: auditRequest.user?.id || 'unknown',
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    throw new AppError(
      'Failed to get audit statistics',
      HttpStatusCode.INTERNAL_SERVER_ERROR,
      'GET_AUDIT_STATS_ERROR'
    );
  }
});

export { router as auditRoutes };
