/**
 * Payment Authentication Utility
 * Handles authentication for payment-related API routes
 */

import { NextRequest, NextResponse } from 'next/server'
import { enhancedAuthMiddleware } from './enhanced-auth.middleware'

export interface AuthenticatedUser {
  userId: string
  email: string
  role: string
  sessionId: string
}

export interface AuthResult {
  success: boolean
  user?: AuthenticatedUser
  error?: string
}

/**
 * Verify authentication token for payment routes
 */
export async function verifyPaymentAuth(request: NextRequest): Promise<AuthResult> {
  try {
    console.log('🔐 Payment auth: Starting authentication verification...')
    
    // Use the enhanced auth middleware to authenticate the request
    const authResult = await enhancedAuthMiddleware.authenticateRequest(request)
    
    console.log('🔐 Payment auth: Middleware result:', {
      authenticated: authResult.authenticated,
      hasUser: !!authResult.user,
      userRole: authResult.user?.role
    })
    
    if (!authResult.authenticated || !authResult.user) {
      console.log('🔐 Payment auth: Authentication failed')
      return {
        success: false,
        error: 'Authentication failed'
      }
    }

    // Transform the user data to match our expected format
    const user: AuthenticatedUser = {
      userId: authResult.user.userId,
      email: authResult.user.email,
      role: authResult.user.role,
      sessionId: authResult.user.sessionId
    }

    console.log('🔐 Payment auth: Authentication successful for user:', {
      userId: user.userId,
      email: user.email,
      role: user.role
    })

    return {
      success: true,
      user
    }
  } catch (error) {
    console.error('🔐 Payment auth: Authentication error:', error)
    return {
      success: false,
      error: 'Authentication verification failed'
    }
  }
}

/**
 * Verify that the user has the required role for payment operations
 */
export function verifyPaymentRole(user: AuthenticatedUser, allowedRoles: string[]): boolean {
  return allowedRoles.includes(user.role)
}

/**
 * Verify that the user belongs to the specified company (if applicable)
 */
export function verifyCompanyAccess(user: AuthenticatedUser, companyId?: string): boolean {
  // For now, allow all authenticated users
  // In the future, this can be enhanced to check company membership
  return true
}

/**
 * Create an unauthorized response
 */
export function createUnauthorizedResponse(message: string = 'Unauthorized'): NextResponse {
  return NextResponse.json(
    { error: { message } },
    { status: 401 }
  )
}

/**
 * Create a forbidden response
 */
export function createForbiddenResponse(message: string = 'Forbidden'): NextResponse {
  return NextResponse.json(
    { error: { message } },
    { status: 403 }
  )
} 