/**
 * Payment Initialization API Route
 * Handles payment initialization with Paystack integration
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
        'Too many payment requests. Please try again later.',
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
    const { amount, currency, channel, description, callbackUrl, metadata } = body

    // Validate required fields
    if (!amount || amount <= 0) {
      return SecurityMiddleware.createErrorResponse(
        'Valid amount is required',
        400,
        request
      )
    }

    if (amount > 1000000) {
      return SecurityMiddleware.createErrorResponse(
        'Amount exceeds maximum limit',
        400,
        request
      )
    }

    // Initialize payment
    const paymentRequest = {
      userId: user.userId,
      email: user.email,
      amount,
      currency: currency || 'NGN',
      channel,
      description,
      callbackUrl,
      metadata: {
        ...metadata,
        user_role: user.role,
        initiated_at: new Date().toISOString()
      }
    }

    const result = await enhancedPaymentService.initializePayment(paymentRequest)

    if (!result.success) {
      // Log security event for failed payment initialization
      await enhancedSecurityService.logSecurityEvent({
        eventType: 'payment_initialization_failed',
        userId: user.userId,
        userRole: user.role,
        resource: '/api/payments/initialize',
        action: 'payment_init',
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        userAgent: request.headers.get('user-agent') || '',
        details: { 
          amount,
          currency,
          error: result.error
        },
        riskLevel: 'medium'
      })

      return SecurityMiddleware.createErrorResponse(
        result.error || 'Failed to initialize payment',
        400,
        request
      )
    }

    // Log successful payment initialization
    await enhancedSecurityService.logSecurityEvent({
      eventType: 'payment_initialization_success',
      userId: user.userId,
      userRole: user.role,
      resource: '/api/payments/initialize',
      action: 'payment_init',
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
      userAgent: request.headers.get('user-agent') || '',
      details: { 
        amount,
        currency,
        transactionId: result.data?.transactionId,
        reference: result.data?.reference
      },
      riskLevel: 'low'
    })

    return SecurityMiddleware.createSuccessResponse(result.data, request)

  } catch (error) {
    console.error('Payment initialization error:', error)
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
