/**
 * Paystack Webhook Handler
 * Processes Paystack webhook events for payment status updates
 */

import { NextRequest, NextResponse } from 'next/server'
import { enhancedPaymentService } from '@/lib/services/enhanced-payment.service'
import { enhancedSecurityService } from '@/lib/security/enhanced-security.service'
import { SecurityMiddleware } from '@/lib/security/middleware'

export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const body = await request.text()
    const signature = request.headers.get('x-paystack-signature')

    if (!signature) {
      await enhancedSecurityService.logSecurityEvent({
        eventType: 'suspicious_activity',
        userId: 'system',
        userRole: 'admin',
        resource: '/api/webhooks/paystack',
        action: 'webhook_no_signature',
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        userAgent: request.headers.get('user-agent') || '',
        details: { reason: 'missing_signature' },
        riskLevel: 'high'
      })

      return SecurityMiddleware.createErrorResponse(
        'Missing signature',
        400,
        request
      )
    }

    // Parse the JSON payload
    let payload
    try {
      payload = JSON.parse(body)
    } catch (error) {
      await enhancedSecurityService.logSecurityEvent({
        eventType: 'suspicious_activity',
        userId: 'system',
        userRole: 'admin',
        resource: '/api/webhooks/paystack',
        action: 'webhook_invalid_json',
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        userAgent: request.headers.get('user-agent') || '',
        details: { reason: 'invalid_json', error: error instanceof Error ? error.message : 'Unknown error' },
        riskLevel: 'medium'
      })

      return SecurityMiddleware.createErrorResponse(
        'Invalid JSON payload',
        400,
        request
      )
    }

    // Handle the webhook
    const result = await enhancedPaymentService.handleWebhook(payload, signature)

    if (!result.success) {
      await enhancedSecurityService.logSecurityEvent({
        eventType: 'suspicious_activity',
        userId: 'system',
        userRole: 'admin',
        resource: '/api/webhooks/paystack',
        action: 'webhook_verification_failed',
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        userAgent: request.headers.get('user-agent') || '',
        details: { 
          reason: 'signature_verification_failed',
          error: result.error,
          event: payload.event
        },
        riskLevel: 'high'
      })

      return SecurityMiddleware.createErrorResponse(
        result.error || 'Webhook verification failed',
        400,
        request
      )
    }

    // Log successful webhook processing
    await enhancedSecurityService.logSecurityEvent({
      eventType: 'payment_webhook_processed',
      userId: 'system',
      userRole: 'admin',
      resource: '/api/webhooks/paystack',
      action: 'webhook_processed',
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
      userAgent: request.headers.get('user-agent') || '',
      details: { 
        event: payload.event,
        reference: payload.data?.reference,
        status: payload.data?.status
      },
      riskLevel: 'low'
    })

    return SecurityMiddleware.createSuccessResponse({
      message: 'Webhook processed successfully'
    }, request)

  } catch (error) {
    console.error('Webhook processing error:', error)
    
    await enhancedSecurityService.logSecurityEvent({
      eventType: 'payment_webhook_error',
      userId: 'system',
      userRole: 'admin',
      resource: '/api/webhooks/paystack',
      action: 'webhook_error',
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
      userAgent: request.headers.get('user-agent') || '',
      details: { 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      riskLevel: 'high'
    })

    return SecurityMiddleware.createErrorResponse(
      'Internal server error',
      500,
      request
    )
  }
}

// Paystack webhooks don't typically use OPTIONS, but we'll handle it for completeness
export async function OPTIONS(request: NextRequest) {
  return SecurityMiddleware.createSuccessResponse({
    message: 'Webhook endpoint ready'
  }, request)
}
