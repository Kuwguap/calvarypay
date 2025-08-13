/**
 * Login API Route for CalvaryPay
 * Handles user authentication
 */

import { NextRequest, NextResponse } from 'next/server'
import { signInSchema } from '@/lib/validation-simple'
import { supabaseService } from '@/lib/supabase'
import { SecurityMiddleware } from '@/lib/security/middleware'
import { IDORProtection } from '@/lib/security/idor-protection'
import { enhancedSecurityService, ValidationSchemas } from '@/lib/security/enhanced-security.service'
import { enhancedAuthMiddleware } from '@/lib/auth/enhanced-auth.middleware'

export async function POST(request: NextRequest) {
  try {
    // Handle preflight requests
    const preflightResponse = SecurityMiddleware.handlePreflight(request)
    if (preflightResponse) {
      return preflightResponse
    }

    // Enhanced rate limiting check
    const rateLimitResult = await enhancedSecurityService.checkRateLimit(request, '/api/auth/login')
    if (!rateLimitResult.allowed) {
      return SecurityMiddleware.createErrorResponse(
        'Too many login attempts. Please try again later.',
        429,
        request,
        { retryAfter: rateLimitResult.retryAfter }
      )
    }

    // Check for suspicious activity
    const isSuspicious = await enhancedSecurityService.detectSuspiciousActivity(request)
    if (isSuspicious) {
      return SecurityMiddleware.createErrorResponse(
        'Request blocked due to suspicious activity.',
        403,
        request
      )
    }

    // Validate and sanitize request body with security checks
    let validatedData
    try {
      validatedData = await SecurityMiddleware.validateRequestBody(request, signInSchema)
    } catch (error) {
      console.error('❌ Security validation failed:', error)
      IDORProtection.logSecurityEvent(
        'access_denied',
        null,
        'login',
        { reason: 'invalid_input', error: error instanceof Error ? error.message : 'Unknown error' }
      )
      return SecurityMiddleware.createErrorResponse(
        'Invalid request data',
        400,
        request
      )
    }

    const { email, password } = validatedData

    console.log('🔥 Login attempt:', { email })

    // Find user in Supabase
    const { user, error: findError } = await supabaseService.findUserByEmail(email)

    if (findError) {
      console.error('❌ Database error during login:', findError)
      IDORProtection.logSecurityEvent(
        'access_denied',
        null,
        'login',
        { reason: 'database_error', email, error: findError }
      )
      return SecurityMiddleware.createErrorResponse(
        'Database error during authentication',
        500,
        request
      )
    }

    if (!user) {
      IDORProtection.logSecurityEvent(
        'access_denied',
        null,
        'login',
        { reason: 'user_not_found', email }
      )
      return SecurityMiddleware.createErrorResponse(
        'Invalid email or password',
        401,
        request
      )
    }

    // Verify password
    const isPasswordValid = await supabaseService.verifyPassword(password, user.password_hash)

    if (!isPasswordValid) {
      IDORProtection.logSecurityEvent(
        'access_denied',
        { id: user.id, email: user.email, role: user.role as any, isActive: user.is_active },
        'login',
        { reason: 'invalid_password', email }
      )
      return SecurityMiddleware.createErrorResponse(
        'Invalid email or password',
        401,
        request
      )
    }

    // Check if user is active
    if (!user.is_active) {
      IDORProtection.logSecurityEvent(
        'access_denied',
        { id: user.id, email: user.email, role: user.role as any, isActive: user.is_active },
        'login',
        { reason: 'account_deactivated', email }
      )
      return SecurityMiddleware.createErrorResponse(
        'Account is deactivated. Please contact support.',
        403,
        request
      )
    }

    // Generate authentication tokens
    const tokens = {
      accessToken: `calvary_access_${Date.now()}_${user.id}`,
      refreshToken: `calvary_refresh_${Date.now()}_${user.id}`,
    }

    // Transform database user to API response format and sanitize based on permissions
    const authenticatedUser = {
      id: user.id,
      email: user.email,
      role: user.role as any,
      isActive: user.is_active
    }

    const responseUser = IDORProtection.sanitizeUserData(
      authenticatedUser,
      {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: user.is_active,
        emailVerified: user.email_verified,
        phoneVerified: user.phone_verified,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
      user.id
    )

    console.log('✅ Login successful:', { userId: user.id, email: user.email, role: user.role })

    // Log successful login
    IDORProtection.logSecurityEvent(
      'permission_check',
      authenticatedUser,
      'login',
      { action: 'successful_login' }
    )

    return SecurityMiddleware.createSuccessResponse({
      user: responseUser,
      tokens: tokens,
      message: 'Login successful'
    }, request)

  } catch (error) {
    console.error('❌ Login error:', error)

    IDORProtection.logSecurityEvent(
      'access_denied',
      null,
      'login',
      { reason: 'internal_error', error: error instanceof Error ? error.message : 'Unknown error' }
    )

    return SecurityMiddleware.createErrorResponse(
      'Internal server error',
      500,
      request
    )
  }
}

export async function OPTIONS(request: NextRequest) {
  return SecurityMiddleware.handlePreflight(request) || SecurityMiddleware.createSuccessResponse({
    message: 'CORS preflight successful'
  }, request)
}
