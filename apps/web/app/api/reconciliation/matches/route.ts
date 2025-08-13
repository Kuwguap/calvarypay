/**
 * Potential Matches API Route
 * Provides potential reconciliation matches for manual review
 */

import { NextRequest, NextResponse } from 'next/server'
import { enhancedAuthMiddleware } from '@/lib/auth/enhanced-auth.middleware'
import { enhancedSecurityService } from '@/lib/security/enhanced-security.service'
import { SecurityMiddleware } from '@/lib/security/middleware'
import { reconciliationService } from '@/lib/services/reconciliation.service'
import { z } from 'zod'

const MatchesQuerySchema = z.object({
  limit: z.string().transform(val => Math.min(parseInt(val) || 50, 100))
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
    
    const validation = enhancedSecurityService.validateAndSanitizeInput(queryParams, MatchesQuerySchema)
    if (!validation.success) {
      return SecurityMiddleware.createErrorResponse(
        `Invalid query parameters: ${validation.errors?.join(', ')}`,
        400,
        request
      )
    }

    const { limit } = validation.data!

    // Get potential matches
    const result = await reconciliationService.getPotentialMatches(user.userId, limit)

    if (!result.success) {
      return SecurityMiddleware.createErrorResponse(
        result.error || 'Failed to fetch potential matches',
        500,
        request
      )
    }

    return SecurityMiddleware.createSuccessResponse({
      matches: result.data || [],
      total: result.data?.length || 0
    }, request)

  } catch (error) {
    console.error('Potential matches error:', error)
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
