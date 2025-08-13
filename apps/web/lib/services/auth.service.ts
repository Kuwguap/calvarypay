/**
 * Authentication Service
 * Handles user authentication, registration, and session management
 */

import { apiClient, ApiResponse } from '../api/index';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'customer' | 'merchant' | 'admin' | 'employee';
  isActive: boolean;
  emailVerified: boolean;
  phoneVerified?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: 'customer' | 'merchant' | 'admin' | 'employee';
  acceptTerms: boolean;
}

export interface LoginResponse {
  user: User;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
}

export class AuthService {
  /**
   * Login user with email and password
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      console.log('🔐 AuthService.login called with:', { email: credentials.email });

      // Use production login endpoint
      console.log('📡 Making API call to /auth/login');
      const response = await apiClient.post<LoginResponse>('/auth/login', credentials);

      console.log('📨 API response received:', response);

      // Store tokens if login successful
      if (response?.tokens) {
        console.log('💾 Storing tokens');
        this.storeTokens(response.tokens);
      } else {
        console.log('⚠️ No tokens in response');
      }

      return response;
    } catch (error) {
      console.error('💥 AuthService login error:', error);
      throw error;
    }
  }

  /**
   * Register new user
   */
  async register(userData: RegisterRequest): Promise<LoginResponse> {
    try {
      console.log('🔥 AuthService: Starting registration process', { email: userData.email, role: userData.role })

      // Use production register endpoint
      const response = await apiClient.post<LoginResponse>('/auth/register', userData);

      if (response.error) {
        console.error('❌ AuthService: Registration failed', response.error)
        throw new Error(response.error.message);
      }

      if (!response.user) {
        throw new Error('Registration failed: No user data received');
      }

      // Store tokens if registration successful
      if (response.tokens) {
        console.log('✅ AuthService: Registration successful, storing tokens')
        this.storeTokens(response.tokens);
      }

      console.log('✅ AuthService: Registration completed successfully')
      return response;
    } catch (error) {
      console.error('❌ AuthService: Registration error:', error);
      throw error;
    }
  }

  /**
   * Store authentication tokens
   */
  private storeTokens(tokens: { accessToken: string; refreshToken: string; expiresIn?: number }) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('CalvaryPay_token', tokens.accessToken);
      localStorage.setItem('CalvaryPay_refresh_token', tokens.refreshToken);
      if (tokens.expiresIn) {
        localStorage.setItem('CalvaryPay_token_expires', (Date.now() + tokens.expiresIn * 1000).toString());
      }
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    return apiClient.logout();
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<string | null> {
    return apiClient.refreshToken();
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<User> {
    return apiClient.get<User>('/auth/profile');
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: UpdateProfileRequest): Promise<User> {
    return apiClient.put<User>('/auth/profile', updates);
  }

  /**
   * Change user password
   */
  async changePassword(passwordData: ChangePasswordRequest): Promise<void> {
    return apiClient.post<void>('/auth/change-password', passwordData);
  }

  /**
   * Request password reset
   */
  async forgotPassword(request: ForgotPasswordRequest): Promise<void> {
    return apiClient.post<void>('/auth/forgot-password', request);
  }

  /**
   * Reset password with token
   */
  async resetPassword(request: ResetPasswordRequest): Promise<void> {
    return apiClient.post<void>('/auth/reset-password', request);
  }

  /**
   * Verify email address
   */
  async verifyEmail(token: string): Promise<void> {
    return apiClient.post<void>('/auth/verify-email', { token });
  }

  /**
   * Resend email verification
   */
  async resendVerification(): Promise<void> {
    return apiClient.post<void>('/auth/resend-verification');
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return apiClient.isAuthenticated();
  }

  /**
   * Get stored user data
   */
  getStoredUser(): User | null {
    return apiClient.getCurrentUser();
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    const user = this.getStoredUser();
    return user?.role === role;
  }

  /**
   * Check if user is admin
   */
  isAdmin(): boolean {
    return this.hasRole('admin');
  }

  /**
   * Check if user is merchant
   */
  isMerchant(): boolean {
    return this.hasRole('merchant');
  }

  /**
   * Check if user is customer
   */
  isCustomer(): boolean {
    return this.hasRole('customer');
  }

  /**
   * Check if user is employee
   */
  isEmployee(): boolean {
    return this.hasRole('employee');
  }

  /**
   * Verify token and get user data
   * Used by API routes to validate tokens (server-side)
   */
  async verifyToken(token: string): Promise<User | null> {
    try {
      console.log('🔍 Verifying token:', {
        tokenLength: token?.length,
        tokenStart: token?.substring(0, 20) + '...',
        tokenFormat: token?.startsWith('calvary_access_') ? 'calvary_access' : 'other'
      });

      // Basic token format check
      if (!token || token.length < 10) {
        console.error('Invalid token format - too short or empty:', { token: token?.substring(0, 20) });
        return null;
      }

      // Extract user ID from our simple token format: calvary_access_${timestamp}_${userId}
      let userId: string;

      try {
        if (token.startsWith('calvary_access_')) {
          // Our simple token format: calvary_access_${timestamp}_${userId}
          // Remove the prefix and split by the last underscore
          const withoutPrefix = token.replace('calvary_access_', '');
          const lastUnderscoreIndex = withoutPrefix.lastIndexOf('_');
          
          if (lastUnderscoreIndex !== -1) {
            // Extract the UUID from the end
            userId = withoutPrefix.substring(lastUnderscoreIndex + 1);
          } else {
            console.error('Invalid token format - no underscore found after prefix');
            return null;
          }
        } else {
          // Try JWT format as fallback
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
            userId = payload.userId || payload.sub || payload.id;
          } else {
            console.error('Unknown token format');
            return null;
          }
        }
      } catch (decodeError) {
        console.error('Token decode failed:', decodeError);
        return null;
      }

      if (!userId) {
        console.error('No user ID found in token');
        return null;
      }

      // Get user from database
      const { supabase } = await import('@/lib/supabase');
      const { data: user, error: userError } = await supabase
        .from('calvary_users')
        .select('id, email, first_name, last_name, phone, role, is_active, email_verified, phone_verified, created_at, updated_at')
        .eq('id', userId)
        .single();

      if (userError || !user) {
        console.error('User fetch error:', userError);
        return null;
      }

      // Check if user is active
      if (!user.is_active) {
        return null;
      }

      // Format user data
      return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        role: user.role,
        isActive: user.is_active,
        emailVerified: user.email_verified,
        phoneVerified: user.phone_verified,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      };
    } catch (error) {
      console.error('Token verification failed:', error);
      return null;
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
