/**
 * Automatic Reconciliation API Route
 * Handles automatic reconciliation between payments and logbook entries
 */

import { NextRequest, NextResponse } from 'next/server'
import { enhancedAuthMiddleware } from '@/lib/auth/enhanced-auth.middleware'
import { enhancedSecurityService } from '@/lib/security/enhanced-security.service'
import { SecurityMiddleware } from '@/lib/security/middleware'
import { reconciliationService } from '@/lib/services/reconciliation.service'
import { z } from 'zod'

const AutoReconciliationSchema = z.object({
  timeWindow: z.number().positive().max(86400000).default(600000), // Default 10 minutes
  amountTolerance: z.number().min(0).max(0.1).default(0.01), // Default 1%
  autoApprove: z.boolean().default(false)
})

export async function POST(request: NextRequest) {
  try {
    // Handle preflight requests
    const preflightResponse = SecurityMiddleware.handlePreflight(request)
    if (preflightResponse) {
      return preflightResponse
    }

    // Rate limiting check (stricter for reconciliation)
    const rateLimitResult = await enhancedSecurityService.checkRateLimit(request, '/api/reconciliation')
    if (!rateLimitResult.allowed) {
      return SecurityMiddleware.createErrorResponse(
        'Too many reconciliation requests. Please try again later.',
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
    const validation = enhancedSecurityService.validateAndSanitizeInput(body, AutoReconciliationSchema)
    
    if (!validation.success) {
      return SecurityMiddleware.createErrorResponse(
        `Validation failed: ${validation.errors?.join(', ')}`,
        400,
        request
      )
    }

    const { timeWindow, amountTolerance } = validation.data!

    // Perform automatic reconciliation
    const result = await reconciliationService.performAutomaticReconciliation(
      user.userId,
      timeWindow,
      amountTolerance
    )

    if (!result.success) {
      // Log security event for failed reconciliation
      await enhancedSecurityService.logSecurityEvent({
        eventType: 'reconciliation_failed',
        userId: user.userId,
        userRole: user.role,
        resource: '/api/reconciliation/auto',
        action: 'auto_reconciliation',
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        userAgent: request.headers.get('user-agent') || '',
        details: { 
          timeWindow,
          amountTolerance,
          error: result.error
        },
        riskLevel: 'medium'
      })

      return SecurityMiddleware.createErrorResponse(
        result.error || 'Failed to perform automatic reconciliation',
        500,
        request
      )
    }

    // Log successful reconciliation
    await enhancedSecurityService.logSecurityEvent({
      eventType: 'reconciliation_completed',
      userId: user.userId,
      userRole: user.role,
      resource: '/api/reconciliation/auto',
      action: 'auto_reconciliation',
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
      userAgent: request.headers.get('user-agent') || '',
      details: { 
        timeWindow,
        amountTolerance,
        totalProcessed: result.data?.totalProcessed,
        automaticMatches: result.data?.automaticMatches,
        manualReviewRequired: result.data?.manualReviewRequired
      },
      riskLevel: 'low'
    })

    return SecurityMiddleware.createSuccessResponse(result.data, request)

  } catch (error) {
    console.error('Automatic reconciliation error:', error)
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
