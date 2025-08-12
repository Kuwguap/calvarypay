import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { 
  supabaseService, 
  jwtMiddleware, 
  redisService, 
  logger, 
  AppError, 
  HttpStatusCode,
  User 
} from '@eliteepay/shared';
import { config } from '../config';

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface AuthResult {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export class AuthService {
  private readonly tableName = 'users';
  private readonly refreshTokenPrefix = 'refresh_token:';

  async register(data: RegisterRequest): Promise<AuthResult> {
    try {
      // Check if user already exists
      const existingUser = await this.getUserByEmail(data.email);
      if (existingUser) {
        throw new AppError(
          'User with this email already exists',
          HttpStatusCode.CONFLICT,
          'USER_EXISTS'
        );
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, config.bcrypt.saltRounds);

      // Create user in database
      const userId = uuidv4();
      const now = new Date().toISOString();

      const userData = {
        id: userId,
        email: data.email,
        password_hash: hashedPassword,
        first_name: data.firstName || null,
        last_name: data.lastName || null,
        phone: data.phone || null,
        is_active: true,
        email_verified: false,
        phone_verified: false,
        created_at: now,
        updated_at: now
      };

      const { data: insertedUser, error } = await supabaseService.getServiceClient()
        .from(this.tableName)
        .insert(userData)
        .select()
        .single();

      if (error) {
        logger.error('Failed to create user in database', { error: error.message });
        throw new AppError(
          'Failed to create user',
          HttpStatusCode.INTERNAL_SERVER_ERROR,
          'USER_CREATION_ERROR'
        );
      }

      // Convert database user to User type
      const user: User = this.mapDatabaseUserToUser(insertedUser);

      // Generate tokens
      const tokens = await this.generateTokens(user);

      logger.info('User registered successfully', {
        userId: user.id,
        email: user.email
      });

      return { user, tokens };

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Registration failed', {
        email: data.email,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError(
        'Registration failed',
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        'REGISTRATION_ERROR'
      );
    }
  }

  async login(email: string, password: string): Promise<AuthResult> {
    try {
      // Get user by email
      const user = await this.getUserByEmail(email);
      if (!user) {
        throw new AppError(
          'Invalid email or password',
          HttpStatusCode.UNAUTHORIZED,
          'INVALID_CREDENTIALS'
        );
      }

      // Check if user is active
      if (!user.isActive) {
        throw new AppError(
          'Account is deactivated',
          HttpStatusCode.UNAUTHORIZED,
          'ACCOUNT_DEACTIVATED'
        );
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        throw new AppError(
          'Invalid email or password',
          HttpStatusCode.UNAUTHORIZED,
          'INVALID_CREDENTIALS'
        );
      }

      // Generate tokens
      const tokens = await this.generateTokens(user);

      logger.info('User logged in successfully', {
        userId: user.id,
        email: user.email
      });

      return { user, tokens };

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Login failed', {
        email,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError(
        'Authentication failed',
        HttpStatusCode.UNAUTHORIZED,
        'AUTHENTICATION_ERROR'
      );
    }
  }

  async refreshTokens(refreshToken: string): Promise<AuthResult> {
    try {
      // Verify refresh token exists in Redis
      const userId = await redisService.get(`${this.refreshTokenPrefix}${refreshToken}`);
      if (!userId) {
        throw new AppError(
          'Invalid refresh token',
          HttpStatusCode.UNAUTHORIZED,
          'INVALID_REFRESH_TOKEN'
        );
      }

      // Get user
      const user = await this.getUserById(userId);
      if (!user || !user.isActive) {
        throw new AppError(
          'User not found or inactive',
          HttpStatusCode.UNAUTHORIZED,
          'USER_NOT_FOUND'
        );
      }

      // Revoke old refresh token
      await redisService.del(`${this.refreshTokenPrefix}${refreshToken}`);

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      logger.info('Tokens refreshed successfully', {
        userId: user.id
      });

      return { user, tokens };

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Token refresh failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError(
        'Token refresh failed',
        HttpStatusCode.UNAUTHORIZED,
        'TOKEN_REFRESH_ERROR'
      );
    }
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      // Remove refresh token from Redis
      await redisService.del(`${this.refreshTokenPrefix}${refreshToken}`);
      
      logger.info('User logged out successfully');
    } catch (error) {
      logger.error('Logout failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      // Don't throw error for logout failures
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      // Get user with password hash
      const user = await this.getUserById(userId);
      if (!user) {
        throw new AppError(
          'User not found',
          HttpStatusCode.NOT_FOUND,
          'USER_NOT_FOUND'
        );
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isCurrentPasswordValid) {
        throw new AppError(
          'Current password is incorrect',
          HttpStatusCode.UNAUTHORIZED,
          'INVALID_CURRENT_PASSWORD'
        );
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, config.bcrypt.saltRounds);

      // Update password in database
      const { error } = await supabaseService.getServiceClient()
        .from(this.tableName)
        .update({
          password_hash: hashedNewPassword,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        logger.error('Failed to update password in database', { error: error.message });
        throw new AppError(
          'Failed to update password',
          HttpStatusCode.INTERNAL_SERVER_ERROR,
          'PASSWORD_UPDATE_ERROR'
        );
      }

      logger.info('Password changed successfully', { userId });

    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      
      logger.error('Change password failed', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError(
        'Failed to change password',
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        'CHANGE_PASSWORD_ERROR'
      );
    }
  }

  private async generateTokens(user: User): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    try {
      // Generate access token
      const accessToken = jwtMiddleware.generateUserToken({
        sub: user.id,
        email: user.email,
        roles: [], // Will be populated from user roles table
        permissions: []
      }, config.jwt.accessTokenExpiry);

      // Generate refresh token
      const refreshToken = uuidv4();
      
      // Store refresh token in Redis with expiry (skip if Redis not available)
      try {
        const refreshTokenTTL = this.parseExpiryToSeconds(config.jwt.refreshTokenExpiry);
        await redisService.set(
          `${this.refreshTokenPrefix}${refreshToken}`,
          user.id,
          refreshTokenTTL
        );
      } catch (error) {
        logger.warn('Redis not available, refresh token not stored', {
          userId: user.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        // Continue without Redis for now
      }

      // Calculate expiry time
      const expiresIn = this.parseExpiryToSeconds(config.jwt.accessTokenExpiry);

      return {
        accessToken,
        refreshToken,
        expiresIn
      };

    } catch (error) {
      logger.error('Token generation failed', {
        userId: user.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw new AppError(
        'Token generation failed',
        HttpStatusCode.INTERNAL_SERVER_ERROR,
        'TOKEN_GENERATION_ERROR'
      );
    }
  }

  private async getUserByEmail(email: string): Promise<(User & { passwordHash: string }) | null> {
    try {
      const { data, error } = await supabaseService.getServiceClient()
        .from(this.tableName)
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // User not found
        }
        throw error;
      }

      return this.mapDatabaseUserToUserWithPassword(data);

    } catch (error) {
      logger.error('Get user by email failed', {
        email,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  private async getUserById(userId: string): Promise<(User & { passwordHash: string }) | null> {
    try {
      const { data, error } = await supabaseService.getServiceClient()
        .from(this.tableName)
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // User not found
        }
        throw error;
      }

      return this.mapDatabaseUserToUserWithPassword(data);

    } catch (error) {
      logger.error('Get user by ID failed', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return null;
    }
  }

  private mapDatabaseUserToUser(dbUser: any): User {
    return {
      id: dbUser.id,
      email: dbUser.email,
      phone: dbUser.phone,
      firstName: dbUser.first_name,
      lastName: dbUser.last_name,
      isActive: dbUser.is_active,
      emailVerified: dbUser.email_verified,
      phoneVerified: dbUser.phone_verified,
      createdAt: dbUser.created_at,
      updatedAt: dbUser.updated_at
    };
  }

  private mapDatabaseUserToUserWithPassword(dbUser: any): User & { passwordHash: string } {
    return {
      ...this.mapDatabaseUserToUser(dbUser),
      passwordHash: dbUser.password_hash
    };
  }

  private parseExpiryToSeconds(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match || !match[1]) {
      return 3600; // Default to 1 hour
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 3600;
      case 'd': return value * 86400;
      default: return 3600;
    }
  }
}
