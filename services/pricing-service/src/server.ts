import { initializeEnvironment } from '@CalvaryPay/shared';

// Initialize environment configuration first
initializeEnvironment();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import { config } from './config';
import { logger, AppError, HttpStatusCode } from '@CalvaryPay/shared';
import { pricingRoutes } from './routes/pricing.routes';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.corsOrigins.split(','),
  credentials: true
}));

// Performance middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Correlation ID middleware
app.use((req, res, next) => {
  const correlationId = req.headers['x-correlation-id'] as string || uuidv4();
  (req as any).correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      service: 'pricing-service',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    },
    error: null,
    meta: {
      correlationId: (req as any).correlationId,
      timestamp: new Date().toISOString(),
      service: 'pricing-service'
    }
  });
});

// API routes
app.use('/api/v1', pricingRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    data: null,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found'
    },
    meta: {
      correlationId: (req as any).correlationId,
      timestamp: new Date().toISOString(),
      service: 'pricing-service'
    }
  });
});

// Error handling middleware
app.use((error: any, req: any, res: any, next: any) => {
  logger.error('Pricing service error', {
    correlationId: req.correlationId,
    error: error.message,
    stack: error.stack
  });

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      success: false,
      data: null,
      error: {
        code: error.code,
        message: error.message
      },
      meta: {
        correlationId: req.correlationId,
        timestamp: new Date().toISOString(),
        service: 'pricing-service'
      }
    });
  }

  res.status(HttpStatusCode.INTERNAL_SERVER_ERROR).json({
    success: false,
    data: null,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred'
    },
    meta: {
      correlationId: req.correlationId,
      timestamp: new Date().toISOString(),
      service: 'pricing-service'
    }
  });
});

// Start server
const server = app.listen(config.port, () => {
  console.log(`🚀 Pricing Service running on port ${config.port}`);
  console.log(`📊 Environment: ${config.nodeEnv}`);
  console.log(`🔧 Log Level: ${config.logLevel}`);
  console.log(`⚡ Cache TTL: ${config.priceCacheTtlSeconds}s`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

export default app;
