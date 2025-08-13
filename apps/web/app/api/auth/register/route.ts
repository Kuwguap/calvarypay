import { NextRequest, NextResponse } from 'next/server'
import { signUpSchema } from '@/lib/validation-simple'
import { supabaseService } from '@/lib/supabase'
import { SecurityMiddleware } from '@/lib/security/middleware'
import { IDORProtection } from '@/lib/security/idor-protection'
import { enhancedAuthMiddleware } from '@/lib/auth/enhanced-auth.middleware'

export async function POST(request: NextRequest) {
  try {
    const preflightResponse = SecurityMiddleware.handlePreflight(request)
    if (preflightResponse) {
      return preflightResponse
    }

    if (!SecurityMiddleware.checkRateLimit(request, 10, 900000)) {
      IDORProtection.logSecurityEvent(
        'access_denied',
        null,
        'registration',
        { reason: 'rate_limit_exceeded', ip: SecurityMiddleware.getClientIP(request) }
      )
      return SecurityMiddleware.createErrorResponse(
        'Too many registration attempts. Please try again later.',
        429,
        request
      )
    }

    let validatedData
    try {
      validatedData = await SecurityMiddleware.validateRequestBody(request, signUpSchema)
    } catch (error) {
      console.error('❌ Security validation failed:', error)
      IDORProtection.logSecurityEvent(
        'access_denied',
        null,
        'registration',
        { reason: 'invalid_input', error: error instanceof Error ? error.message : 'Unknown error' }
      )
      return SecurityMiddleware.createErrorResponse(
        'Invalid request data',
        400,
        request
      )
    }

    const { firstName, lastName, email, phone, password, role } = validatedData

    console.log('🔥 Registration attempt:', { firstName, lastName, email, phone, role })

    const { user: existingUser, error: findError } = await supabaseService.findUserByEmail(email)

    if (findError) {
      console.error('❌ Database error during user lookup:', findError)
      IDORProtection.logSecurityEvent(
        'access_denied',
        null,
        'registration',
        { reason: 'database_error', error: findError }
      )
      return SecurityMiddleware.createErrorResponse(
        'Database error during registration',
        500,
        request
      )
    }

    if (existingUser) {
      IDORProtection.logSecurityEvent(
        'access_denied',
        null,
        'registration',
        { reason: 'duplicate_email', email }
      )
      return SecurityMiddleware.createErrorResponse(
        'User with this email already exists',
        409,
        request
      )
    }

    const { user: newUser, error: createError } = await supabaseService.createUser({
      email,
      password,
      firstName,
      lastName,
      phone,
      role
    })

    if (createError || !newUser) {
      console.error('❌ Database error during user creation:', createError)
      IDORProtection.logSecurityEvent(
        'access_denied',
        null,
        'registration',
        { reason: 'user_creation_failed', error: createError }
      )
      return SecurityMiddleware.createErrorResponse(
        'Failed to create user account',
        500,
        request
      )
    }

    // Generate authentication tokens using enhanced auth middleware
    const tokenPair = await enhancedAuthMiddleware.generateTokenPair(
      newUser.id,
      newUser.email,
      newUser.role as any
    )

    const tokens = {
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
    }

    const responseUser = {
      id: newUser.id,
      firstName: newUser.first_name,
      lastName: newUser.last_name,
      email: newUser.email,
      phone: newUser.phone,
      role: newUser.role,
      isActive: newUser.is_active,
      emailVerified: newUser.email_verified,
      phoneVerified: newUser.phone_verified,
      createdAt: newUser.created_at,
      updatedAt: newUser.updated_at,
    }

    console.log('✅ Registration successful:', responseUser)

    IDORProtection.logSecurityEvent(
      'permission_check',
      { id: newUser.id, email: newUser.email, role: newUser.role as any, isActive: true },
      'registration',
      { action: 'user_created' }
    )

    return SecurityMiddleware.createSuccessResponse({
      user: responseUser,
      tokens: tokens,
      message: 'Registration successful'
    }, request)

  } catch (error) {
    console.error('❌ Registration error:', error)
    
    IDORProtection.logSecurityEvent(
      'access_denied',
      null,
      'registration',
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
  return SecurityMiddleware.handlePreflight(request) || SecurityMiddleware.createSuccessResponse({}, request)
}
