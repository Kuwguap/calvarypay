import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { logger, AppError, HttpStatusCode } from '@CalvaryPay/shared';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';

const router = Router();
const authService = new AuthService();
const userService = new UserService();

// Production authentication endpoints
router.post('/login', async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;

  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      throw new AppError('Email and password are required', HttpStatusCode.BAD_REQUEST, 'MISSING_CREDENTIALS');
    }

    // Authenticate user
    const result = await authService.login(email, password);

    logger.info('User login successful', {
      correlationId: authReq.correlationId,
      userId: result.user.id,
      email: result.user.email
    });

    res.status(200).json({
      success: true,
      data: result,
      error: null,
      meta: {
        correlationId: authReq.correlationId,
        timestamp: new Date().toISOString(),
        service: 'user-service'
      }
    });
  } catch (error) {
    logger.error('User login failed', {
      correlationId: authReq.correlationId,
      error: error instanceof Error ? error.message : 'Unknown error'
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
          correlationId: authReq.correlationId,
          timestamp: new Date().toISOString(),
          service: 'user-service'
        }
      });
    } else {
      res.status(500).json({
        success: false,
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        },
        meta: {
          correlationId: authReq.correlationId,
          timestamp: new Date().toISOString(),
          service: 'user-service'
        }
      });
    }
  }
});

router.post('/register', async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;

  try {
    const { email, password, firstName, lastName, phone } = req.body;

    // Validate input
    if (!email || !password) {
      throw new AppError('Email and password are required', HttpStatusCode.BAD_REQUEST, 'MISSING_CREDENTIALS');
    }

    // Register user
    const result = await authService.register({
      email,
      password,
      firstName,
      lastName,
      phone
    });

    logger.info('User registration successful', {
      correlationId: authReq.correlationId,
      userId: result.user.id,
      email: result.user.email
    });

    res.status(201).json({
      success: true,
      data: result,
      error: null,
      meta: {
        correlationId: authReq.correlationId,
        timestamp: new Date().toISOString(),
        service: 'user-service'
      }
    });
  } catch (error) {
    logger.error('User registration failed', {
      correlationId: authReq.correlationId,
      error: error instanceof Error ? error.message : 'Unknown error'
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
          correlationId: authReq.correlationId,
          timestamp: new Date().toISOString(),
          service: 'user-service'
        }
      });
    } else {
      res.status(500).json({
        success: false,
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        },
        meta: {
          correlationId: authReq.correlationId,
          timestamp: new Date().toISOString(),
          service: 'user-service'
        }
      });
    }
  }
});

// Test authentication endpoint that doesn't require database
router.post('/test-login', async (req: Request, res: Response) => {
  const authReq = req as AuthRequest;
  try {
    const { email, password } = req.body;

    // Simple test credentials
    if (email === 'test@CalvaryPay.com' && password === 'Test123!') {
      const testUser = {
        id: 'test-user-id',
        email: 'test@CalvaryPay.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'customer',
        isEmailVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const testTokens = {
        accessToken: 'test-access-token-' + Date.now(),
        refreshToken: 'test-refresh-token-' + Date.now()
      };

      logger.info('Test login successful', {
        correlationId: authReq.correlationId,
        userId: testUser.id,
        email: testUser.email
      });

      res.status(200).json({
        success: true,
        data: {
          user: testUser,
          tokens: testTokens
        },
        error: null,
        meta: {
          correlationId: authReq.correlationId,
          timestamp: new Date().toISOString(),
          service: 'user-service'
        }
      });
    } else {
      throw new AppError('Invalid test credentials', HttpStatusCode.UNAUTHORIZED, 'INVALID_CREDENTIALS');
    }
  } catch (error) {
    logger.error('Test login failed', {
      correlationId: authReq.correlationId,
      error: error instanceof Error ? error.message : 'Unknown error'
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
          correlationId: authReq.correlationId,
          timestamp: new Date().toISOString(),
          service: 'user-service'
        }
      });
    } else {
      res.status(500).json({
        success: false,
        data: null,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Internal server error'
        },
        meta: {
          correlationId: authReq.correlationId,
          timestamp: new Date().toISOString(),
          service: 'user-service'
        }
      });
    }
  }
});

interface AuthRequest extends Request {
  correlationId: string;
}

// Register validation rules
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('firstName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  body('lastName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Valid phone number is required')
];

// Login validation rules
const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Refresh token validation
const refreshValidation = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
];

// Register endpoint
router.post('/register', registerValidation, async (req: Request, res: Response) => {
  const authRequest = req as AuthRequest;
  
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

    const { email, password, firstName, lastName, phone } = req.body;

    // Register user
    const result = await authService.register({
      email,
      password,
      firstName,
      lastName,
      phone
    });

    logger.info('User registered successfully', {
      correlationId: authRequest.correlationId,
      userId: result.user.id,
      email: result.user.email
    });

    res.status(HttpStatusCode.CREATED).json({
      success: true,
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          phone: result.user.phone,
          isActive: result.user.isActive,
          emailVerified: result.user.emailVerified,
          phoneVerified: result.user.phoneVerified,
          createdAt: result.user.createdAt
        },
        tokens: result.tokens
      },
      error: null,
      meta: {
        correlationId: authRequest.correlationId,
        timestamp: new Date().toISOString(),
        service: 'user-service'
      }
    });

  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    logger.error('Registration failed', {
      correlationId: authRequest.correlationId,
      email: req.body.email,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    throw new AppError(
      'Registration failed',
      HttpStatusCode.INTERNAL_SERVER_ERROR,
      'REGISTRATION_ERROR'
    );
  }
});

// Login endpoint
router.post('/login', loginValidation, async (req: Request, res: Response) => {
  const authRequest = req as AuthRequest;
  
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

    const { email, password } = req.body;

    // Authenticate user
    const result = await authService.login(email, password);

    logger.info('User logged in successfully', {
      correlationId: authRequest.correlationId,
      userId: result.user.id,
      email: result.user.email
    });

    res.json({
      success: true,
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          phone: result.user.phone,
          isActive: result.user.isActive,
          emailVerified: result.user.emailVerified,
          phoneVerified: result.user.phoneVerified
        },
        tokens: result.tokens
      },
      error: null,
      meta: {
        correlationId: authRequest.correlationId,
        timestamp: new Date().toISOString(),
        service: 'user-service'
      }
    });

  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    logger.error('Login failed', {
      correlationId: authRequest.correlationId,
      email: req.body.email,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    throw new AppError(
      'Authentication failed',
      HttpStatusCode.UNAUTHORIZED,
      'AUTHENTICATION_ERROR'
    );
  }
});

// Refresh token endpoint
router.post('/refresh', refreshValidation, async (req: Request, res: Response) => {
  const authRequest = req as AuthRequest;
  
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

    const { refreshToken } = req.body;

    // Refresh tokens
    const result = await authService.refreshTokens(refreshToken);

    logger.info('Tokens refreshed successfully', {
      correlationId: authRequest.correlationId,
      userId: result.user.id
    });

    res.json({
      success: true,
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          phone: result.user.phone,
          isActive: result.user.isActive,
          emailVerified: result.user.emailVerified,
          phoneVerified: result.user.phoneVerified
        },
        tokens: result.tokens
      },
      error: null,
      meta: {
        correlationId: authRequest.correlationId,
        timestamp: new Date().toISOString(),
        service: 'user-service'
      }
    });

  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    logger.error('Token refresh failed', {
      correlationId: authRequest.correlationId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    throw new AppError(
      'Token refresh failed',
      HttpStatusCode.UNAUTHORIZED,
      'TOKEN_REFRESH_ERROR'
    );
  }
});

// Logout endpoint
router.post('/logout', async (req: Request, res: Response) => {
  const authRequest = req as AuthRequest;
  
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    logger.info('User logged out successfully', {
      correlationId: authRequest.correlationId
    });

    res.json({
      success: true,
      data: {
        message: 'Logged out successfully'
      },
      error: null,
      meta: {
        correlationId: authRequest.correlationId,
        timestamp: new Date().toISOString(),
        service: 'user-service'
      }
    });

  } catch (error) {
    logger.error('Logout failed', {
      correlationId: authRequest.correlationId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    // Even if logout fails, return success to client
    res.json({
      success: true,
      data: {
        message: 'Logged out successfully'
      },
      error: null,
      meta: {
        correlationId: authRequest.correlationId,
        timestamp: new Date().toISOString(),
        service: 'user-service'
      }
    });
  }
});

export { router as authRoutes };
