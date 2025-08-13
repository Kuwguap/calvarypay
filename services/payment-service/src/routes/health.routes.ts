import { Router, Request, Response } from 'express';
import { logger, supabaseService } from '@CalvaryPay/shared';
import { config } from '../config';
import axios from 'axios';

const router = Router();

interface HealthRequest extends Request {
  correlationId: string;
}

// Basic health check
router.get('/', async (req: Request, res: Response) => {
  const healthRequest = req as HealthRequest;
  try {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: config.name,
      version: config.version,
      environment: config.environment,
      uptime: process.uptime()
    };

    res.json({
      success: true,
      data: healthStatus,
      error: null,
      meta: {
        correlationId: healthRequest.correlationId,
        timestamp: new Date().toISOString(),
        service: config.name
      }
    });
  } catch (error) {
    logger.error('Health check failed', {
      correlationId: healthRequest.correlationId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(503).json({
      success: false,
      data: null,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Service health check failed'
      },
      meta: {
        correlationId: healthRequest.correlationId,
        timestamp: new Date().toISOString(),
        service: config.name
      }
    });
  }
});

// Detailed health check with dependencies
router.get('/detailed', async (req: Request, res: Response) => {
  const healthRequest = req as HealthRequest;
  try {
    const startTime = Date.now();
    const dependencies: any = {};

    // Check Supabase connection
    try {
      const supabaseStart = Date.now();
      const { data, error } = await supabaseService.getClient()
        .from('transactions')
        .select('count')
        .limit(1);
      
      if (error) throw error;
      
      dependencies.supabase = {
        status: 'healthy',
        responseTime: Date.now() - supabaseStart
      };
    } catch (error) {
      dependencies.supabase = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Check Paystack API connection
    try {
      const paystackStart = Date.now();
      const response = await axios.get(`${config.paystack.baseUrl}/bank`, {
        headers: {
          'Authorization': `Bearer ${config.paystack.secretKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });
      
      dependencies.paystack = {
        status: response.status === 200 ? 'healthy' : 'unhealthy',
        responseTime: Date.now() - paystackStart
      };
    } catch (error) {
      dependencies.paystack = {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Determine overall status
    const hasUnhealthyDependencies = Object.values(dependencies).some(
      (dep: any) => dep.status === 'unhealthy'
    );

    const overallStatus = hasUnhealthyDependencies ? 'degraded' : 'healthy';
    const statusCode = overallStatus === 'healthy' ? 200 : 503;

    const healthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      service: config.name,
      version: config.version,
      environment: config.environment,
      uptime: process.uptime(),
      responseTime: Date.now() - startTime,
      dependencies
    };

    res.status(statusCode).json({
      success: overallStatus === 'healthy',
      data: healthStatus,
      error: null,
      meta: {
        correlationId: healthRequest.correlationId,
        timestamp: new Date().toISOString(),
        service: config.name
      }
    });
  } catch (error) {
    logger.error('Detailed health check failed', {
      correlationId: healthRequest.correlationId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    res.status(503).json({
      success: false,
      data: null,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Detailed health check failed'
      },
      meta: {
        correlationId: healthRequest.correlationId,
        timestamp: new Date().toISOString(),
        service: config.name
      }
    });
  }
});

// Readiness probe
router.get('/ready', async (req: Request, res: Response) => {
  const healthRequest = req as HealthRequest;
  try {
    // Check if essential dependencies are available
    const { error } = await supabaseService.getClient()
      .from('transactions')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    
    res.json({
      success: true,
      data: {
        status: 'ready',
        timestamp: new Date().toISOString(),
        service: config.name
      },
      error: null,
      meta: {
        correlationId: healthRequest.correlationId,
        timestamp: new Date().toISOString(),
        service: config.name
      }
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      data: null,
      error: {
        code: 'NOT_READY',
        message: 'Service is not ready'
      },
      meta: {
        correlationId: healthRequest.correlationId,
        timestamp: new Date().toISOString(),
        service: config.name
      }
    });
  }
});

// Liveness probe
router.get('/live', (req: Request, res: Response) => {
  const healthRequest = req as HealthRequest;
  res.json({
    success: true,
    data: {
      status: 'alive',
      timestamp: new Date().toISOString(),
      service: config.name,
      uptime: process.uptime()
    },
    error: null,
    meta: {
      correlationId: healthRequest.correlationId,
      timestamp: new Date().toISOString(),
      service: config.name
    }
  });
});

export { router as healthRoutes };
