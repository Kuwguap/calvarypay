import { Router, Request, Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { jwtMiddleware, logger, AppError, HttpStatusCode } from '@CalvaryPay/shared';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';

const router = Router();
const authService = new AuthService();
const userService = new UserService();

interface UserRequest extends Request {
  correlationId: string;
  user?: {
    id: string;
    email: string;
    roles: string[];
    permissions: string[];
  };
}

// Authentication middleware for all user routes
router.use(jwtMiddleware.authenticate() as any);

// Get current user profile
router.get('/me', async (req: Request, res: Response) => {
  const userRequest = req as UserRequest;
  
  try {
    if (!userRequest.user) {
      throw new AppError('User not authenticated', HttpStatusCode.UNAUTHORIZED, 'NOT_AUTHENTICATED');
    }

    const user = await userService.getUserById(userRequest.user.id);

    res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        isActive: user.isActive,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      },
      error: null,
      meta: {
        correlationId: userRequest.correlationId,
        timestamp: new Date().toISOString(),
        service: 'user-service'
      }
    });

  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    logger.error('Get user profile failed', {
      correlationId: userRequest.correlationId,
      userId: userRequest.user?.id || 'unknown',
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    throw new AppError(
      'Failed to get user profile',
      HttpStatusCode.INTERNAL_SERVER_ERROR,
      'GET_PROFILE_ERROR'
    );
  }
});

// Update user profile
const updateProfileValidation = [
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

router.put('/me', updateProfileValidation, async (req: Request, res: Response) => {
  const userRequest = req as UserRequest;
  
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

    if (!userRequest.user) {
      throw new AppError('User not authenticated', HttpStatusCode.UNAUTHORIZED, 'NOT_AUTHENTICATED');
    }

    const { firstName, lastName, phone } = req.body;

    const updatedUser = await userService.updateUser(userRequest.user.id, {
      firstName,
      lastName,
      phone
    });

    logger.info('User profile updated successfully', {
      correlationId: userRequest.correlationId,
      userId: updatedUser.id
    });

    res.json({
      success: true,
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        phone: updatedUser.phone,
        isActive: updatedUser.isActive,
        emailVerified: updatedUser.emailVerified,
        phoneVerified: updatedUser.phoneVerified,
        updatedAt: updatedUser.updatedAt
      },
      error: null,
      meta: {
        correlationId: userRequest.correlationId,
        timestamp: new Date().toISOString(),
        service: 'user-service'
      }
    });

  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    logger.error('Update user profile failed', {
      correlationId: userRequest.correlationId,
      userId: userRequest.user?.id || 'unknown',
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    throw new AppError(
      'Failed to update user profile',
      HttpStatusCode.INTERNAL_SERVER_ERROR,
      'UPDATE_PROFILE_ERROR'
    );
  }
});

// Change password
const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];

router.put('/me/password', changePasswordValidation, async (req: Request, res: Response) => {
  const userRequest = req as UserRequest;
  
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

    if (!userRequest.user) {
      throw new AppError('User not authenticated', HttpStatusCode.UNAUTHORIZED, 'NOT_AUTHENTICATED');
    }

    const { currentPassword, newPassword } = req.body;

    await authService.changePassword(userRequest.user.id, currentPassword, newPassword);

    logger.info('Password changed successfully', {
      correlationId: userRequest.correlationId,
      userId: userRequest.user.id
    });

    res.json({
      success: true,
      data: {
        message: 'Password changed successfully'
      },
      error: null,
      meta: {
        correlationId: userRequest.correlationId,
        timestamp: new Date().toISOString(),
        service: 'user-service'
      }
    });

  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    logger.error('Change password failed', {
      correlationId: userRequest.correlationId,
      userId: userRequest.user?.id || 'unknown',
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    throw new AppError(
      'Failed to change password',
      HttpStatusCode.INTERNAL_SERVER_ERROR,
      'CHANGE_PASSWORD_ERROR'
    );
  }
});

// Get user by ID (admin only)
router.get('/:id', 
  jwtMiddleware.requireRole(['admin']) as any,
  param('id').isUUID().withMessage('Valid user ID is required'),
  async (req: Request, res: Response) => {
    const userRequest = req as UserRequest;
    
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

      const userId = req.params.id;
      if (!userId) {
        throw new AppError('User ID is required', HttpStatusCode.BAD_REQUEST, 'MISSING_USER_ID');
      }

      const user = await userService.getUserById(userId);

      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          isActive: user.isActive,
          emailVerified: user.emailVerified,
          phoneVerified: user.phoneVerified,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt
        },
        error: null,
        meta: {
          correlationId: userRequest.correlationId,
          timestamp: new Date().toISOString(),
          service: 'user-service'
        }
      });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Get user by ID failed', {
        correlationId: userRequest.correlationId,
        userId: req.params.id || 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError(
        'Failed to get user',
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        'GET_USER_ERROR'
      );
    }
  }
);

export { router as userRoutes };
