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
import { correlationMiddleware } from './middleware/correlation.middleware';
// import { rateLimitMiddleware } from './middleware/rateLimit.middleware';
import { errorHandler } from './middleware/error.middleware';
import { healthRoutes } from './routes/health.routes';
import proxyRoutes from './routes/proxy.routes';
import { docsRoutes } from './routes/docs.routes';

const app = express();

// Security middleware
app.use(helmet({
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    },
    reportOnly: process.env.NODE_ENV === 'development'
  }
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3005', // Frontend application
    'http://localhost:3000', // API Gateway (for internal calls)
    'http://localhost:3001', // User Service
    'http://localhost:3002', // Payment Service
    'http://localhost:3003', // Audit Service
    'http://localhost:3004'  // Pricing Service
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID', 'Idempotency-Key', 'Accept', 'Origin', 'X-Requested-With'],
  exposedHeaders: ['X-Correlation-ID'],
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
}));

// Custom body parsing that preserves raw body for proxy
app.use((req: any, res, next) => {
  // Skip body parsing for proxy routes to avoid stream consumption
  if (req.path.startsWith('/api/')) {
    // Store raw body for proxy forwarding
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk: string) => {
      body += chunk;
    });
    req.on('end', () => {
      req.rawBody = body;
      // Also parse JSON for logging/debugging
      if (body && req.headers['content-type']?.includes('application/json')) {
        try {
          req.body = JSON.parse(body);
        } catch (e) {
          req.body = {};
        }
      }
      next();
    });
    req.on('error', (err: any) => {
      logger.error('Request body parsing error', { error: err.message });
      next(err);
    });
  } else {
    // Use normal Express body parsing for non-proxy routes
    express.json({ limit: '10mb' })(req, res, next);
  }
});

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

// Correlation ID middleware (skip for proxy routes to avoid conflicts)
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    // Skip correlation middleware for proxy routes
    next();
  } else {
    (correlationMiddleware as any)(req, res, next);
  }
});

// Rate limiting (temporarily disabled for debugging)
// app.use(rateLimitMiddleware);

// Health check routes (no auth required)
app.use('/health', healthRoutes);

// API documentation routes
app.use('/docs', docsRoutes);

// API routes with authentication and proxying
app.use('/api', proxyRoutes);

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
      service: 'api-gateway'
    }
  });
});

// Error handling middleware (must be last)
app.use(errorHandler as any);

// Start server
const PORT = config.port;
const HOST = config.host;

app.listen(PORT, HOST, () => {
  logger.info(`API Gateway started successfully`, {
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
