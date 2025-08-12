import jwt, { SignOptions } from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';
import { logger } from '../logging/logger';
import { AppError, JWTPayload } from '../types';
import { supabaseService } from '../database/supabase.service';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    roles: string[];
    permissions: string[];
  };
  correlationId: string;
}

export interface JWTConfig {
  secret: string;
  issuer: string;
  audience: string;
  algorithm: 'HS256' | 'RS256';
}

export class JWTMiddleware {
  private config: JWTConfig;

  constructor(config?: JWTConfig) {
    this.config = config || {
      secret: process.env.JWT_SECRET!,
      issuer: process.env.JWT_ISSUER || 'eliteepay-auth',
      audience: process.env.JWT_AUDIENCE || 'eliteepay-services',
      algorithm: 'HS256'
    };

    if (!this.config.secret) {
      throw new AppError('JWT secret is required', 500, 'CONFIG_ERROR');
    }
  }

  // Main authentication middleware
  public authenticate() {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        const token = this.extractToken(req);
        
        if (!token) {
          throw new AppError('Authorization token required', 401, 'MISSING_TOKEN');
        }

        const payload = await this.verifyToken(token);
        const user = await this.validateUser(payload);

        // Add user context to request
        req.user = user;

        logger.debug('User authenticated successfully', {
          correlationId: req.correlationId,
          userId: user.id,
          email: user.email,
          roles: user.roles
        });

        next();
      } catch (error) {
        this.handleAuthError(error, req, res, next);
      }
    };
  }

  // Optional authentication (doesn't fail if no token)
  public optionalAuthenticate() {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        const token = this.extractToken(req);
        
        if (token) {
          const payload = await this.verifyToken(token);
          const user = await this.validateUser(payload);
          req.user = user;
        }

        next();
      } catch (error) {
        // For optional auth, we just log the error and continue
        logger.warn('Optional authentication failed', {
          correlationId: req.correlationId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        next();
      }
    };
  }

  // Role-based authorization middleware
  public requireRole(requiredRoles: string | string[]) {
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      try {
        if (!req.user) {
          throw new AppError('Authentication required', 401, 'AUTHENTICATION_REQUIRED');
        }

        const hasRequiredRole = roles.some(role => req.user!.roles.includes(role));
        
        if (!hasRequiredRole) {
          logger.warn('Access denied - insufficient role', {
            correlationId: req.correlationId,
            userId: req.user.id,
            userRoles: req.user.roles,
            requiredRoles: roles
          });
          throw new AppError('Insufficient permissions', 403, 'INSUFFICIENT_PERMISSIONS');
        }

        next();
      } catch (error) {
        this.handleAuthError(error, req, res, next);
      }
    };
  }

  // Permission-based authorization middleware
  public requirePermission(requiredPermissions: string | string[]) {
    const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
    
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      try {
        if (!req.user) {
          throw new AppError('Authentication required', 401, 'AUTHENTICATION_REQUIRED');
        }

        const hasRequiredPermission = permissions.some(permission => 
          req.user!.permissions.includes(permission) || req.user!.permissions.includes('*')
        );
        
        if (!hasRequiredPermission) {
          logger.warn('Access denied - insufficient permissions', {
            correlationId: req.correlationId,
            userId: req.user.id,
            userPermissions: req.user.permissions,
            requiredPermissions: permissions
          });
          throw new AppError('Insufficient permissions', 403, 'INSUFFICIENT_PERMISSIONS');
        }

        next();
      } catch (error) {
        this.handleAuthError(error, req, res, next);
      }
    };
  }

  // Service-to-service authentication
  public authenticateService() {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      try {
        const token = this.extractToken(req);
        
        if (!token) {
          throw new AppError('Service token required', 401, 'MISSING_SERVICE_TOKEN');
        }

        const payload = await this.verifyToken(token);
        
        // Validate service token
        if (payload.sub !== 'service' || !payload.service_name) {
          throw new AppError('Invalid service token', 401, 'INVALID_SERVICE_TOKEN');
        }

        // Add service context to request
        req.user = {
          id: 'service',
          email: 'service@eliteepay.com',
          roles: ['service'],
          permissions: ['*']
        };

        logger.debug('Service authenticated successfully', {
          correlationId: req.correlationId,
          serviceName: payload.service_name
        });

        next();
      } catch (error) {
        this.handleAuthError(error, req, res, next);
      }
    };
  }

  // Extract token from request
  private extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
    
    // Also check for token in query parameter (for WebSocket connections)
    if (req.query.token && typeof req.query.token === 'string') {
      return req.query.token;
    }
    
    return null;
  }

  // Verify JWT token
  private async verifyToken(token: string): Promise<JWTPayload> {
    try {
      const payload = jwt.verify(token, this.config.secret, {
        issuer: this.config.issuer,
        audience: this.config.audience,
        algorithms: [this.config.algorithm]
      }) as JWTPayload;

      // Check token expiration
      if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
        throw new AppError('Token has expired', 401, 'TOKEN_EXPIRED');
      }

      return payload;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError('Invalid token', 401, 'INVALID_TOKEN');
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError('Token has expired', 401, 'TOKEN_EXPIRED');
      }
      throw error;
    }
  }

  // Validate user exists and is active
  private async validateUser(payload: JWTPayload): Promise<{
    id: string;
    email: string;
    roles: string[];
    permissions: string[];
  }> {
    try {
      const { data: user, error } = await supabaseService
        .getServiceClient()
        .from('user_schema.users')
        .select(`
          id,
          email,
          is_active,
          user_roles!inner(
            roles!inner(
              name,
              permissions
            )
          )
        `)
        .eq('id', payload.sub)
        .single();

      if (error || !user) {
        throw new AppError('User not found', 401, 'USER_NOT_FOUND');
      }

      if (!user.is_active) {
        throw new AppError('User account is disabled', 401, 'USER_DISABLED');
      }

      // Extract roles and permissions
      const roles = user.user_roles.map((ur: any) => ur.roles.name);
      const permissions = user.user_roles.flatMap((ur: any) => ur.roles.permissions);

      return {
        id: user.id,
        email: user.email,
        roles,
        permissions: [...new Set(permissions)] // Remove duplicates
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('User validation failed', {
        userId: payload.sub,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new AppError('User validation failed', 401, 'USER_VALIDATION_ERROR');
    }
  }

  // Handle authentication errors
  private handleAuthError(error: any, req: AuthenticatedRequest, res: Response, next: NextFunction): void {
    logger.warn('Authentication failed', {
      correlationId: req.correlationId,
      error: error instanceof Error ? error.message : 'Unknown error',
      url: req.url,
      method: req.method,
      ip: req.ip
    });

    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        success: false,
        data: null,
        error: {
          code: error.code,
          message: error.message
        },
        meta: {
          correlationId: req.correlationId,
          timestamp: new Date().toISOString(),
          service: process.env.SERVICE_NAME || 'unknown'
        }
      });
    } else {
      res.status(401).json({
        success: false,
        data: null,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Authentication failed'
        },
        meta: {
          correlationId: req.correlationId,
          timestamp: new Date().toISOString(),
          service: process.env.SERVICE_NAME || 'unknown'
        }
      });
    }
  }

  // Generate user token
  public generateUserToken(payload: {
    sub: string;
    email: string;
    roles?: string[];
    permissions?: string[];
  }, expiresIn: string = '15m'): string {
    try {
      const tokenPayload = {
        ...payload,
        iat: Math.floor(Date.now() / 1000)
      };

      return jwt.sign(tokenPayload, this.config.secret, {
        expiresIn: expiresIn,
        issuer: this.config.issuer,
        audience: this.config.audience
      });
    } catch (error) {
      logger.error('Failed to generate user token', {
        userId: payload.sub,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new AppError('Token generation failed', 500, 'TOKEN_GENERATION_ERROR');
    }
  }

  // Generate service token (for internal service communication)
  public generateServiceToken(serviceName: string, expiresIn: string = '1h'): string {
    const payload = {
      sub: 'service',
      service_name: serviceName,
      iat: Math.floor(Date.now() / 1000)
    };

    try {
      return jwt.sign(payload, this.config.secret, {
        expiresIn: expiresIn,
        issuer: this.config.issuer,
        audience: this.config.audience
      });
    } catch (error) {
      logger.error('Failed to generate service token', {
        serviceName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw new AppError('Token generation failed', 500, 'TOKEN_GENERATION_ERROR');
    }
  }
}

// Export singleton instance
export const jwtMiddleware = new JWTMiddleware();

// Export types are already exported above
