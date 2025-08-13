/**
 * Manual Reconciliation API Route
 * Handles manual reconciliation between specific payments and logbook entries
 */

import { NextRequest, NextResponse } from 'next/server'
import { enhancedAuthMiddleware } from '@/lib/auth/enhanced-auth.middleware'
import { enhancedSecurityService } from '@/lib/security/enhanced-security.service'
import { SecurityMiddleware } from '@/lib/security/middleware'
import { reconciliationService } from '@/lib/services/reconciliation.service'
import { z } from 'zod'

const ManualReconciliationSchema = z.object({
  transactionId: z.string().uuid(),
  logbookEntryId: z.string().uuid(),
  notes: z.string().max(1000).optional()
})

export async function POST(request: NextRequest) {
  try {
    // Handle preflight requests
    const preflightResponse = SecurityMiddleware.handlePreflight(request)
    if (preflightResponse) {
      return preflightResponse
    }

    // Rate limiting check
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
    const validation = enhancedSecurityService.validateAndSanitizeInput(body, ManualReconciliationSchema)
    
    if (!validation.success) {
      return SecurityMiddleware.createErrorResponse(
        `Validation failed: ${validation.errors?.join(', ')}`,
        400,
        request
      )
    }

    const { transactionId, logbookEntryId, notes } = validation.data!

    // Perform manual reconciliation
    const result = await reconciliationService.manualReconciliation(
      transactionId,
      logbookEntryId,
      user.userId,
      notes
    )

    if (!result.success) {
      // Log security event for failed reconciliation
      await enhancedSecurityService.logSecurityEvent({
        eventType: 'reconciliation_failed',
        userId: user.userId,
        userRole: user.role,
        resource: '/api/reconciliation/manual',
        action: 'manual_reconciliation',
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        userAgent: request.headers.get('user-agent') || '',
        details: { 
          transactionId,
          logbookEntryId,
          error: result.error
        },
        riskLevel: 'medium'
      })

      return SecurityMiddleware.createErrorResponse(
        result.error || 'Failed to perform manual reconciliation',
        400,
        request
      )
    }

    // Log successful reconciliation
    await enhancedSecurityService.logSecurityEvent({
      eventType: 'reconciliation_completed',
      userId: user.userId,
      userRole: user.role,
      resource: '/api/reconciliation/manual',
      action: 'manual_reconciliation',
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
      userAgent: request.headers.get('user-agent') || '',
      details: { 
        transactionId,
        logbookEntryId,
        reconciliationId: result.data?.reconciliationId,
        confidenceScore: result.data?.confidenceScore
      },
      riskLevel: 'low'
    })

    return SecurityMiddleware.createSuccessResponse(result.data, request)

  } catch (error) {
    console.error('Manual reconciliation error:', error)
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
