/**
 * Receipt Upload API Route
 * Handles photo uploads for logbook entries
 */

import { NextRequest, NextResponse } from 'next/server'
import { enhancedAuthMiddleware } from '@/lib/auth/enhanced-auth.middleware'
import { enhancedSecurityService } from '@/lib/security/enhanced-security.service'
import { SecurityMiddleware } from '@/lib/security/middleware'
import { supabaseService } from '@/lib/supabase'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Handle preflight requests
    const preflightResponse = SecurityMiddleware.handlePreflight(request)
    if (preflightResponse) {
      return preflightResponse
    }

    // Rate limiting check (stricter for file uploads)
    const rateLimitResult = await enhancedSecurityService.checkRateLimit(request, '/api/logbook/upload')
    if (!rateLimitResult.allowed) {
      return SecurityMiddleware.createErrorResponse(
        'Too many upload requests. Please try again later.',
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
    const entryId = params.id

    // Validate entry ID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(entryId)) {
      return SecurityMiddleware.createErrorResponse(
        'Invalid entry ID format',
        400,
        request
      )
    }

    // Verify the logbook entry exists and belongs to the user
    const { data: entry, error: entryError } = await supabaseService.client
      .from('logbook_entries')
      .select('id, user_id')
      .eq('id', entryId)
      .eq('user_id', user.userId)
      .single()

    if (entryError || !entry) {
      return SecurityMiddleware.createErrorResponse(
        'Logbook entry not found or access denied',
        404,
        request
      )
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('receipt') as File

    if (!file) {
      return SecurityMiddleware.createErrorResponse(
        'No file provided',
        400,
        request
      )
    }

    // Validate file
    const maxSize = 5 * 1024 * 1024 // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']

    if (file.size > maxSize) {
      await enhancedSecurityService.logSecurityEvent({
        eventType: 'suspicious_activity',
        userId: user.userId,
        userRole: user.role,
        resource: `/api/logbook/${entryId}/upload-receipt`,
        action: 'file_size_exceeded',
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        userAgent: request.headers.get('user-agent') || '',
        details: { 
          fileSize: file.size,
          maxSize,
          fileName: file.name
        },
        riskLevel: 'medium'
      })

      return SecurityMiddleware.createErrorResponse(
        'File size exceeds 5MB limit',
        400,
        request
      )
    }

    if (!allowedTypes.includes(file.type)) {
      await enhancedSecurityService.logSecurityEvent({
        eventType: 'suspicious_activity',
        userId: user.userId,
        userRole: user.role,
        resource: `/api/logbook/${entryId}/upload-receipt`,
        action: 'invalid_file_type',
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        userAgent: request.headers.get('user-agent') || '',
        details: { 
          fileType: file.type,
          allowedTypes,
          fileName: file.name
        },
        riskLevel: 'medium'
      })

      return SecurityMiddleware.createErrorResponse(
        'Invalid file type. Only JPEG, PNG, and WebP are allowed',
        400,
        request
      )
    }

    // Generate unique filename
    const timestamp = Date.now()
    const extension = file.name.split('.').pop()
    const filename = `receipts/${user.userId}/${entryId}/${timestamp}.${extension}`

    try {
      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabaseService.client.storage
        .from('logbook-receipts')
        .upload(filename, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Storage error uploading receipt:', uploadError)
        return SecurityMiddleware.createErrorResponse(
          'Failed to upload receipt',
          500,
          request
        )
      }

      // Get public URL
      const { data: urlData } = supabaseService.client.storage
        .from('logbook-receipts')
        .getPublicUrl(filename)

      // Update logbook entry with receipt info
      const { error: updateError } = await supabaseService.client
        .from('logbook_entries')
        .update({
          receipt_url: urlData.publicUrl,
          receipt_filename: file.name,
          receipt_size: file.size,
          receipt_mime_type: file.type
        })
        .eq('id', entryId)
        .eq('user_id', user.userId)

      if (updateError) {
        console.error('Database error updating receipt info:', updateError)
        
        // Clean up uploaded file
        await supabaseService.client.storage
          .from('logbook-receipts')
          .remove([filename])

        return SecurityMiddleware.createErrorResponse(
          'Failed to update receipt information',
          500,
          request
        )
      }

      // Log successful upload
      await enhancedSecurityService.logSecurityEvent({
        eventType: 'receipt_uploaded',
        userId: user.userId,
        userRole: user.role,
        resource: `/api/logbook/${entryId}/upload-receipt`,
        action: 'upload_receipt',
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        userAgent: request.headers.get('user-agent') || '',
        details: { 
          entryId,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          uploadPath: filename
        },
        riskLevel: 'low'
      })

      return SecurityMiddleware.createSuccessResponse({
        url: urlData.publicUrl,
        filename: file.name,
        size: file.size,
        mimeType: file.type,
        message: 'Receipt uploaded successfully'
      }, request)

    } catch (error) {
      console.error('Receipt upload error:', error)
      return SecurityMiddleware.createErrorResponse(
        'Failed to upload receipt',
        500,
        request
      )
    }

  } catch (error) {
    console.error('Receipt upload error:', error)
    return SecurityMiddleware.createErrorResponse(
      'Internal server error',
      500,
      request
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
    const entryId = params.id

    // Get current receipt info
    const { data: entry, error: entryError } = await supabaseService.client
      .from('logbook_entries')
      .select('receipt_url, receipt_filename')
      .eq('id', entryId)
      .eq('user_id', user.userId)
      .single()

    if (entryError || !entry) {
      return SecurityMiddleware.createErrorResponse(
        'Logbook entry not found or access denied',
        404,
        request
      )
    }

    if (!entry.receipt_url) {
      return SecurityMiddleware.createErrorResponse(
        'No receipt found for this entry',
        404,
        request
      )
    }

    // Extract filename from URL
    const urlParts = entry.receipt_url.split('/')
    const filename = urlParts.slice(-4).join('/') // Get the last 4 parts: receipts/userId/entryId/filename

    // Delete from storage
    const { error: deleteError } = await supabaseService.client.storage
      .from('logbook-receipts')
      .remove([filename])

    if (deleteError) {
      console.error('Storage error deleting receipt:', deleteError)
    }

    // Update database to remove receipt info
    const { error: updateError } = await supabaseService.client
      .from('logbook_entries')
      .update({
        receipt_url: null,
        receipt_filename: null,
        receipt_size: null,
        receipt_mime_type: null
      })
      .eq('id', entryId)
      .eq('user_id', user.userId)

    if (updateError) {
      console.error('Database error removing receipt info:', updateError)
      return SecurityMiddleware.createErrorResponse(
        'Failed to remove receipt information',
        500,
        request
      )
    }

    // Log receipt deletion
    await enhancedSecurityService.logSecurityEvent({
      eventType: 'receipt_deleted',
      userId: user.userId,
      userRole: user.role,
      resource: `/api/logbook/${entryId}/upload-receipt`,
      action: 'delete_receipt',
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
      userAgent: request.headers.get('user-agent') || '',
      details: { 
        entryId,
        deletedFileName: entry.receipt_filename
      },
      riskLevel: 'low'
    })

    return SecurityMiddleware.createSuccessResponse({
      message: 'Receipt deleted successfully'
    }, request)

  } catch (error) {
    console.error('Receipt deletion error:', error)
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
