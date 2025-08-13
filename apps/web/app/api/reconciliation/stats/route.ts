/**
 * Reconciliation Statistics API Route
 * Provides reconciliation statistics and analytics
 */

import { NextRequest, NextResponse } from 'next/server'
import { enhancedAuthMiddleware } from '@/lib/auth/enhanced-auth.middleware'
import { enhancedSecurityService } from '@/lib/security/enhanced-security.service'
import { SecurityMiddleware } from '@/lib/security/middleware'
import { reconciliationService } from '@/lib/services/reconciliation.service'
import { z } from 'zod'

const StatsQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
})

export async function GET(request: NextRequest) {
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
        'Too many requests. Please try again later.',
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

    // Parse and validate query parameters
    const url = new URL(request.url)
    const queryParams = Object.fromEntries(url.searchParams.entries())
    
    const validation = enhancedSecurityService.validateAndSanitizeInput(queryParams, StatsQuerySchema)
    if (!validation.success) {
      return SecurityMiddleware.createErrorResponse(
        `Invalid query parameters: ${validation.errors?.join(', ')}`,
        400,
        request
      )
    }

    const { startDate, endDate } = validation.data!

    // Get reconciliation statistics
    const result = await reconciliationService.getReconciliationStats(
      user.userId,
      startDate,
      endDate
    )

    if (!result.success) {
      return SecurityMiddleware.createErrorResponse(
        result.error || 'Failed to fetch reconciliation statistics',
        500,
        request
      )
    }

    return SecurityMiddleware.createSuccessResponse(result.data, request)

  } catch (error) {
    console.error('Reconciliation stats error:', error)
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
