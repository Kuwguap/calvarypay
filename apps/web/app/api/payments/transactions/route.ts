/**
 * Transactions API Route
 * Handles fetching user transactions with filtering and pagination
 */

import { NextRequest, NextResponse } from 'next/server'
import { enhancedAuthMiddleware } from '@/lib/auth/enhanced-auth.middleware'
import { enhancedSecurityService } from '@/lib/security/enhanced-security.service'
import { SecurityMiddleware } from '@/lib/security/middleware'
import { supabaseService } from '@/lib/supabase'
import { z } from 'zod'

const TransactionsQuerySchema = z.object({
  page: z.string().transform(val => parseInt(val) || 1),
  limit: z.string().transform(val => Math.min(parseInt(val) || 20, 100)),
  status: z.enum(['pending', 'success', 'failed', 'abandoned', 'cancelled']).optional(),
  currency: z.enum(['NGN', 'USD', 'GHS', 'KES', 'ZAR']).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['created_at', 'paid_at', 'amount_minor', 'status']).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export async function GET(request: NextRequest) {
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
    
    const validation = enhancedSecurityService.validateAndSanitizeInput(queryParams, TransactionsQuerySchema)
    if (!validation.success) {
      return SecurityMiddleware.createErrorResponse(
        `Invalid query parameters: ${validation.errors?.join(', ')}`,
        400,
        request
      )
    }

    const validatedQuery = validation.data!

    // Build database query
    let dbQuery = supabaseService.client
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', user.userId)

    // Apply filters
    if (validatedQuery.status) {
      dbQuery = dbQuery.eq('status', validatedQuery.status)
    }

    if (validatedQuery.currency) {
      dbQuery = dbQuery.eq('currency', validatedQuery.currency)
    }

    if (validatedQuery.startDate) {
      dbQuery = dbQuery.gte('created_at', validatedQuery.startDate)
    }

    if (validatedQuery.endDate) {
      dbQuery = dbQuery.lte('created_at', validatedQuery.endDate)
    }

    if (validatedQuery.search) {
      dbQuery = dbQuery.or(`description.ilike.%${validatedQuery.search}%,paystack_reference.ilike.%${validatedQuery.search}%`)
    }

    // Apply sorting
    dbQuery = dbQuery.order(validatedQuery.sortBy, { ascending: validatedQuery.sortOrder === 'asc' })

    // Apply pagination
    const offset = (validatedQuery.page - 1) * validatedQuery.limit
    dbQuery = dbQuery.range(offset, offset + validatedQuery.limit - 1)

    const { data: transactions, error, count } = await dbQuery

    if (error) {
      console.error('Database error fetching transactions:', error)
      return SecurityMiddleware.createErrorResponse(
        'Failed to fetch transactions',
        500,
        request
      )
    }

    // Transform transactions for frontend
    const transformedTransactions = transactions?.map(transaction => ({
      id: transaction.id,
      userId: transaction.user_id,
      reference: transaction.paystack_reference,
      amount: transaction.currency === 'NGN' ? transaction.amount_minor / 100 : transaction.amount_minor,
      amountMinor: transaction.amount_minor,
      currency: transaction.currency,
      status: transaction.status,
      description: transaction.description,
      channel: transaction.channel,
      paidAt: transaction.paid_at,
      createdAt: transaction.created_at,
      updatedAt: transaction.updated_at,
      metadata: transaction.metadata
    })) || []

    // Log successful fetch
    await enhancedSecurityService.logSecurityEvent({
      eventType: 'data_access',
      userId: user.userId,
      userRole: user.role,
      resource: '/api/payments/transactions',
      action: 'fetch_transactions',
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
      userAgent: request.headers.get('user-agent') || '',
      details: { 
        transactionCount: transformedTransactions.length,
        filters: {
          status: validatedQuery.status,
          currency: validatedQuery.currency,
          search: validatedQuery.search
        }
      },
      riskLevel: 'low'
    })

    return SecurityMiddleware.createSuccessResponse({
      transactions: transformedTransactions,
      pagination: {
        total: count || 0,
        page: validatedQuery.page,
        limit: validatedQuery.limit,
        totalPages: Math.ceil((count || 0) / validatedQuery.limit)
      }
    }, request)

  } catch (error) {
    console.error('Transactions fetch error:', error)
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
