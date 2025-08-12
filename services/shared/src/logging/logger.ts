import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

export interface LogContext {
  correlationId?: string;
  userId?: string;
  service?: string;
  operation?: string;
  [key: string]: any;
}

class Logger {
  private winston: winston.Logger;
  private serviceName: string;

  constructor() {
    this.serviceName = process.env.SERVICE_NAME || 'unknown-service';
    
    const logFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json(),
      winston.format.printf(({ timestamp, level, message, service, correlationId, ...meta }) => {
        const logEntry = {
          timestamp,
          level,
          message,
          service: service || this.serviceName,
          correlationId,
          ...meta
        };
        return JSON.stringify(logEntry);
      })
    );

    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: process.env.NODE_ENV === 'development' 
          ? winston.format.combine(
              winston.format.colorize(),
              winston.format.simple(),
              winston.format.printf(({ timestamp, level, message, service, correlationId, ...meta }) => {
                const metaStr = Object.keys(meta).length > 0 ? JSON.stringify(meta, null, 2) : '';
                return `${timestamp} [${service}] ${level}: ${message} ${correlationId ? `[${correlationId}]` : ''} ${metaStr}`;
              })
            )
          : logFormat
      })
    ];

    // Add file transport in production
    if (process.env.NODE_ENV === 'production') {
      transports.push(
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          format: logFormat
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
          format: logFormat
        })
      );
    }

    this.winston = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      transports,
      exitOnError: false
    });

    // Handle uncaught exceptions and unhandled rejections
    this.winston.exceptions.handle(
      new winston.transports.Console(),
      new winston.transports.File({ filename: 'logs/exceptions.log' })
    );

    this.winston.rejections.handle(
      new winston.transports.Console(),
      new winston.transports.File({ filename: 'logs/rejections.log' })
    );
  }

  private formatMessage(message: string, context?: LogContext): [string, LogContext] {
    const logContext: LogContext = {
      service: this.serviceName,
      correlationId: context?.correlationId || this.generateCorrelationId(),
      ...context
    };

    return [message, logContext];
  }

  public debug(message: string, context?: LogContext): void {
    const [msg, ctx] = this.formatMessage(message, context);
    this.winston.debug(msg, ctx);
  }

  public info(message: string, context?: LogContext): void {
    const [msg, ctx] = this.formatMessage(message, context);
    this.winston.info(msg, ctx);
  }

  public warn(message: string, context?: LogContext): void {
    const [msg, ctx] = this.formatMessage(message, context);
    this.winston.warn(msg, ctx);
  }

  public error(message: string, context?: LogContext): void {
    const [msg, ctx] = this.formatMessage(message, context);
    this.winston.error(msg, ctx);
  }

  public fatal(message: string, context?: LogContext): void {
    const [msg, ctx] = this.formatMessage(message, context);
    this.winston.error(msg, { ...ctx, level: 'fatal' });
  }

  // Structured logging methods
  public logRequest(req: any, res: any, responseTime: number, context?: LogContext): void {
    this.info('HTTP Request', {
      ...context,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: req.user?.id
    });
  }

  public logError(error: Error, context?: LogContext): void {
    this.error('Application Error', {
      ...context,
      error: error.message,
      stack: error.stack,
      name: error.name
    });
  }

  public logDatabaseOperation(operation: string, table: string, duration: number, context?: LogContext): void {
    this.debug('Database Operation', {
      ...context,
      operation,
      table,
      duration
    });
  }

  public logExternalServiceCall(service: string, endpoint: string, duration: number, success: boolean, context?: LogContext): void {
    this.info('External Service Call', {
      ...context,
      service,
      endpoint,
      duration,
      success
    });
  }

  public logSecurityEvent(eventType: string, severity: 'low' | 'medium' | 'high' | 'critical', context?: LogContext): void {
    this.warn('Security Event', {
      ...context,
      eventType,
      severity,
      timestamp: new Date().toISOString()
    });
  }

  public logBusinessEvent(eventType: string, data: any, context?: LogContext): void {
    this.info('Business Event', {
      ...context,
      eventType,
      data
    });
  }

  public logPerformanceMetric(metric: string, value: number, unit: string, context?: LogContext): void {
    this.debug('Performance Metric', {
      ...context,
      metric,
      value,
      unit
    });
  }

  // Correlation ID management
  public generateCorrelationId(): string {
    return uuidv4();
  }

  public createChildLogger(context: LogContext): Logger {
    const childLogger = new Logger();
    const originalFormatMessage = childLogger.formatMessage.bind(childLogger);
    
    childLogger.formatMessage = (message: string, additionalContext?: LogContext) => {
      return originalFormatMessage(message, { ...context, ...additionalContext });
    };
    
    return childLogger;
  }

  // Express middleware for request logging
  public requestMiddleware() {
    return (req: any, res: any, next: any) => {
      const startTime = Date.now();
      const correlationId = req.headers['x-correlation-id'] || this.generateCorrelationId();
      
      // Add correlation ID to request
      req.correlationId = correlationId;
      
      // Add correlation ID to response headers
      res.setHeader('X-Correlation-ID', correlationId);

      // Log request start
      this.debug('Request started', {
        correlationId,
        method: req.method,
        url: req.url,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });

      // Override res.end to log response
      const originalEnd = res.end;
      res.end = function(chunk: any, encoding: any) {
        const responseTime = Date.now() - startTime;
        
        logger.logRequest(req, res, responseTime, { correlationId });
        
        originalEnd.call(res, chunk, encoding);
      };

      next();
    };
  }

  // Health check for logging system
  public healthCheck(): { status: 'healthy' | 'unhealthy'; details: any } {
    try {
      // Test logging
      this.debug('Health check test log');
      
      return {
        status: 'healthy',
        details: {
          level: this.winston.level,
          transports: this.winston.transports.length,
          service: this.serviceName
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export class for testing
export { Logger };
