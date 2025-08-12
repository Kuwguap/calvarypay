import { initializeEnvironment } from '@eliteepay/shared';

// Initialize environment configuration first
initializeEnvironment();

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { logger } from '@eliteepay/shared';
import { config } from './config';
import { errorHandler } from './middleware/error.middleware';
import { healthRoutes } from './routes/health.routes';
import { paymentRoutes } from './routes/payment.routes';
import { webhookRoutes } from './routes/webhook.routes';
import { logbookRoutes } from './domains/logbook/logbook.routes';

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID', 'X-User-ID', 'X-User-Email', 'X-User-Roles', 'Idempotency-Key']
}));

// Raw body parser for webhooks (must be before JSON parser)
app.use('/webhooks', express.raw({ type: 'application/json' }));

// Body parsing for other routes
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

// Webhook routes (public, but with signature validation)
app.use('/webhooks', webhookRoutes);

// Payment routes (protected)
app.use('/payments', paymentRoutes);

// Logbook routes (protected)
app.use('/logbook', logbookRoutes);

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
      service: 'payment-service'
    }
  });
});

// Error handling middleware (must be last)
app.use(errorHandler as any);

// Start server
const PORT = config.port;
const HOST = config.host;

app.listen(PORT, HOST, () => {
  logger.info(`Payment Service started successfully`, {
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
