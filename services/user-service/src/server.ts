import { initializeEnvironment } from '@eliteepay/shared';

// Initialize environment configuration first
initializeEnvironment();

import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { logger, supabaseService } from '@eliteepay/shared';
import { config } from './config';
import { errorHandler } from './middleware/error.middleware';
import { healthRoutes } from './routes/health.routes';
import { authRoutes } from './routes/auth.routes';
import { userRoutes } from './routes/user.routes';

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3005', // Frontend application
    'http://localhost:3000', // API Gateway
    'http://localhost:3001', // User Service (self)
    'http://localhost:3002', // Payment Service
    'http://localhost:3003', // Audit Service
    'http://localhost:3004'  // Pricing Service
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID', 'X-User-ID', 'X-User-Email', 'X-User-Roles', 'Accept', 'Origin', 'X-Requested-With'],
  exposedHeaders: ['X-Correlation-ID'],
  optionsSuccessStatus: 200
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

// Correlation ID middleware (will be added by API Gateway)
// app.use(correlationMiddleware as any);

// Health check routes
app.use('/health', healthRoutes);

// Authentication routes (public)
app.use('/auth', authRoutes);

// User management routes (protected)
app.use('/users', userRoutes);

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
      service: 'user-service'
    }
  });
});

// Error handling middleware (must be last)
app.use(errorHandler as any);

// Initialize database connection
async function initializeDatabase() {
  try {
    await supabaseService.connect();
    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize database', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    // Don't exit - allow service to start without database for now
  }
}

// Start server
const PORT = config.port;
const HOST = config.host;

async function startServer() {
  // Initialize database first
  await initializeDatabase();

  app.listen(PORT, HOST, () => {
    logger.info(`User Service started successfully`, {
      port: PORT,
      host: HOST,
      environment: config.environment,
      version: config.version
    });
  });
}

startServer().catch((error) => {
  logger.error('Failed to start server', {
    error: error instanceof Error ? error.message : 'Unknown error'
  });
  process.exit(1);
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
