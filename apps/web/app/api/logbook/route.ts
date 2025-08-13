/**
 * Logbook API Routes
 * Handles CRUD operations for logbook entries
 */

import { NextRequest, NextResponse } from 'next/server'
import { enhancedAuthMiddleware } from '@/lib/auth/enhanced-auth.middleware'
import { enhancedSecurityService, ValidationSchemas } from '@/lib/security/enhanced-security.service'
import { SecurityMiddleware } from '@/lib/security/middleware'
import { supabaseService } from '@/lib/supabase'
import { z } from 'zod'

// Validation schemas
const CreateLogbookEntrySchema = z.object({
  type: z.enum(['fuel', 'maintenance', 'toll', 'parking', 'food', 'accommodation', 'other']),
  amount: z.number().positive().max(1000000),
  currency: z.enum(['NGN', 'USD', 'GHS', 'KES', 'ZAR']).default('NGN'),
  title: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  notes: z.string().max(2000).optional(),
  locationName: z.string().max(255).optional(),
  locationAddress: z.string().max(500).optional(),
  locationCoordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }).optional(),
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  tags: z.array(z.string().max(50)).max(10).optional(),
  metadata: z.record(z.any()).optional()
})

const LogbookQuerySchema = z.object({
  page: z.string().transform(val => parseInt(val) || 1),
  limit: z.string().transform(val => Math.min(parseInt(val) || 20, 100)),
  type: z.enum(['fuel', 'maintenance', 'toll', 'parking', 'food', 'accommodation', 'other']).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  isReconciled: z.string().transform(val => val === 'true' ? true : val === 'false' ? false : undefined).optional(),
  search: z.string().max(100).optional(),
  sortBy: z.enum(['created_at', 'entry_date', 'amount_minor', 'type']).default('entry_date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc')
})

export async function POST(request: NextRequest) {
  try {
    // Handle preflight requests
    const preflightResponse = SecurityMiddleware.handlePreflight(request)
    if (preflightResponse) {
      return preflightResponse
    }

    // Rate limiting check
    const rateLimitResult = await enhancedSecurityService.checkRateLimit(request, '/api/logbook')
    if (!rateLimitResult.allowed) {
      return SecurityMiddleware.createErrorResponse(
        'Too many logbook requests. Please try again later.',
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
    const validation = enhancedSecurityService.validateAndSanitizeInput(body, CreateLogbookEntrySchema)
    
    if (!validation.success) {
      return SecurityMiddleware.createErrorResponse(
        `Validation failed: ${validation.errors?.join(', ')}`,
        400,
        request
      )
    }

    const validatedData = validation.data!

    // Convert amount to minor units
    const amountMinor = validatedData.currency === 'NGN' ? validatedData.amount * 100 : validatedData.amount

    // Prepare database record
    const entryData = {
      user_id: user.userId,
      type: validatedData.type,
      amount_minor: amountMinor,
      currency: validatedData.currency,
      title: validatedData.title,
      description: validatedData.description,
      notes: validatedData.notes,
      location_name: validatedData.locationName,
      location_address: validatedData.locationAddress,
      location_coordinates: validatedData.locationCoordinates ? 
        `POINT(${validatedData.locationCoordinates.lng} ${validatedData.locationCoordinates.lat})` : null,
      entry_date: validatedData.entryDate,
      tags: validatedData.tags || [],
      metadata: validatedData.metadata || {}
    }

    // Insert into database
    const { data, error } = await supabaseService.client
      .from('logbook_entries')
      .insert([entryData])
      .select('*')
      .single()

    if (error) {
      console.error('Database error creating logbook entry:', error)
      return SecurityMiddleware.createErrorResponse(
        'Failed to create logbook entry',
        500,
        request
      )
    }

    // Log security event
    await enhancedSecurityService.logSecurityEvent({
      eventType: 'logbook_entry_created',
      userId: user.userId,
      userRole: user.role,
      resource: '/api/logbook',
      action: 'create_entry',
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
      userAgent: request.headers.get('user-agent') || '',
      details: { 
        entryId: data.id,
        type: validatedData.type,
        amount: validatedData.amount,
        currency: validatedData.currency
      },
      riskLevel: 'low'
    })

    return SecurityMiddleware.createSuccessResponse(transformDatabaseEntry(data), request)

  } catch (error) {
    console.error('Logbook creation error:', error)
    return SecurityMiddleware.createErrorResponse(
      'Internal server error',
      500,
      request
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Handle preflight requests
    const preflightResponse = SecurityMiddleware.handlePreflight(request)
    if (preflightResponse) {
      return preflightResponse
    }

    // Rate limiting check
    const rateLimitResult = await enhancedSecurityService.checkRateLimit(request, '/api/logbook')
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
    
    const validation = enhancedSecurityService.validateAndSanitizeInput(queryParams, LogbookQuerySchema)
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
      .from('logbook_entries')
      .select('*', { count: 'exact' })
      .eq('user_id', user.userId)

    // Apply filters
    if (validatedQuery.type) {
      dbQuery = dbQuery.eq('type', validatedQuery.type)
    }

    if (validatedQuery.startDate) {
      dbQuery = dbQuery.gte('entry_date', validatedQuery.startDate)
    }

    if (validatedQuery.endDate) {
      dbQuery = dbQuery.lte('entry_date', validatedQuery.endDate)
    }

    if (validatedQuery.isReconciled !== undefined) {
      dbQuery = dbQuery.eq('is_reconciled', validatedQuery.isReconciled)
    }

    if (validatedQuery.search) {
      dbQuery = dbQuery.or(`title.ilike.%${validatedQuery.search}%,description.ilike.%${validatedQuery.search}%`)
    }

    // Apply sorting
    dbQuery = dbQuery.order(validatedQuery.sortBy, { ascending: validatedQuery.sortOrder === 'asc' })

    // Apply pagination
    const offset = (validatedQuery.page - 1) * validatedQuery.limit
    dbQuery = dbQuery.range(offset, offset + validatedQuery.limit - 1)

    const { data, error, count } = await dbQuery

    if (error) {
      console.error('Database error fetching logbook entries:', error)
      return SecurityMiddleware.createErrorResponse(
        'Failed to fetch logbook entries',
        500,
        request
      )
    }

    const entries = data?.map(entry => transformDatabaseEntry(entry)) || []

    return SecurityMiddleware.createSuccessResponse({
      entries,
      pagination: {
        total: count || 0,
        page: validatedQuery.page,
        limit: validatedQuery.limit,
        totalPages: Math.ceil((count || 0) / validatedQuery.limit)
      }
    }, request)

  } catch (error) {
    console.error('Logbook fetch error:', error)
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

// Helper function to transform database entry
function transformDatabaseEntry(dbEntry: any) {
  return {
    id: dbEntry.id,
    userId: dbEntry.user_id,
    type: dbEntry.type,
    amount: dbEntry.currency === 'NGN' ? dbEntry.amount_minor / 100 : dbEntry.amount_minor,
    amountMinor: dbEntry.amount_minor,
    currency: dbEntry.currency,
    title: dbEntry.title,
    description: dbEntry.description,
    notes: dbEntry.notes,
    locationName: dbEntry.location_name,
    locationAddress: dbEntry.location_address,
    locationCoordinates: dbEntry.location_coordinates ? {
      lat: dbEntry.location_coordinates.y,
      lng: dbEntry.location_coordinates.x
    } : undefined,
    receiptUrl: dbEntry.receipt_url,
    receiptFilename: dbEntry.receipt_filename,
    isReconciled: dbEntry.is_reconciled,
    reconciledTransactionId: dbEntry.reconciled_transaction_id,
    reconciledAt: dbEntry.reconciled_at,
    tags: dbEntry.tags || [],
    metadata: dbEntry.metadata || {},
    entryDate: dbEntry.entry_date,
    createdAt: dbEntry.created_at,
    updatedAt: dbEntry.updated_at
  }
}
