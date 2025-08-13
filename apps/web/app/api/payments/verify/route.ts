/**
 * Payment Verification API Route
 * Handles payment verification with Paystack
 */

import { NextRequest, NextResponse } from 'next/server'
import { enhancedPaymentService } from '@/lib/services/enhanced-payment.service'
import { enhancedAuthMiddleware } from '@/lib/auth/enhanced-auth.middleware'
import { enhancedSecurityService } from '@/lib/security/enhanced-security.service'
import { SecurityMiddleware } from '@/lib/security/middleware'

export async function POST(request: NextRequest) {
  try {
    // Handle preflight requests
    const preflightResponse = SecurityMiddleware.handlePreflight(request)
    if (preflightResponse) {
      return preflightResponse
    }

    // Rate limiting check
    const rateLimitResult = await enhancedSecurityService.checkRateLimit(request, '/api/payments')
    if (!rateLimitResult.allowed) {
      return SecurityMiddleware.createErrorResponse(
        'Too many verification requests. Please try again later.',
        429,
        request,
        { retryAfter: rateLimitResult.retryAfter }
      )
    }

    // Authenticate user
    const authResult = await enhancedAuthMiddleware.authenticateRequest(request)
    if (!authResult.authenticated) {
      return authResult.response || SecurityMiddleware.createErrorResponse(
        'Authentication required',
        401,
        request
      )
    }

    const user = authResult.user!

    // Parse and validate request body
    const body = await request.json()
    const { reference, expectedAmount } = body

    // Validate required fields
    if (!reference) {
      return SecurityMiddleware.createErrorResponse(
        'Payment reference is required',
        400,
        request
      )
    }

    // Verify payment
    const result = await enhancedPaymentService.verifyPayment(reference, expectedAmount)

    if (!result.success) {
      // Log security event for failed payment verification
      await enhancedSecurityService.logSecurityEvent({
        eventType: 'payment_verification_failed',
        userId: user.userId,
        userRole: user.role,
        resource: '/api/payments/verify',
        action: 'payment_verify',
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        userAgent: request.headers.get('user-agent') || '',
        details: { 
          reference,
          expectedAmount,
          error: result.error
        },
        riskLevel: 'medium'
      })

      return SecurityMiddleware.createErrorResponse(
        result.error || 'Failed to verify payment',
        400,
        request
      )
    }

    // Log successful payment verification
    await enhancedSecurityService.logSecurityEvent({
      eventType: 'payment_verification_success',
      userId: user.userId,
      userRole: user.role,
      resource: '/api/payments/verify',
      action: 'payment_verify',
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
      userAgent: request.headers.get('user-agent') || '',
      details: { 
        reference,
        status: result.data?.status,
        amount: result.data?.amount,
        transactionId: result.data?.transactionId
      },
      riskLevel: 'low'
    })

    return SecurityMiddleware.createSuccessResponse(result.data, request)

  } catch (error) {
    console.error('Payment verification error:', error)
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
