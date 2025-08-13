import { initializeEnvironment } from '@CalvaryPay/shared';

// Initialize environment configuration first
initializeEnvironment();

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { logger } from '@CalvaryPay/shared';
import { config } from './config';
import { errorHandler } from './middleware/error.middleware';
import { healthRoutes } from './routes/health.routes';
import { auditRoutes } from './routes/audit.routes';
import { reconciliationRoutes } from './domains/reconciliation/reconciliation.routes';

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID', 'X-User-ID', 'X-User-Email', 'X-User-Roles']
}));

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Compression
app.use(compression());

// Request logging
app.use(morgan('combined', {
  stream: {
    write: (message: string) => {
      logger.info(message.trim(), { component: 'http' });
    }
  }
}));

// Health check routes
app.use('/health', healthRoutes);

// Audit routes (protected - admin/auditor only)
app.use('/audit', auditRoutes);

// Reconciliation routes (protected - admin only)
app.use('/reconciliation', reconciliationRoutes);

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
      correlationId: (req as any).correlationId || 'unknown',
      timestamp: new Date().toISOString(),
      service: 'audit-service'
    }
  });
});

// Error handling middleware (must be last)
app.use(errorHandler as any);

// Start server
const PORT = config.port;
const HOST = config.host;

app.listen(PORT, HOST, () => {
  logger.info(`Audit Service started successfully`, {
    port: PORT,
    host: HOST,
    environment: config.environment,
    version: config.version
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

export default app;
