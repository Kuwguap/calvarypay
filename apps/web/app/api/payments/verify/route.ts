/**
 * Payment Verification API
 * Verifies Paystack transactions and returns transaction details
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyPaymentAuth, createUnauthorizedResponse } from '@/lib/auth/payment-auth'
import { paystackService } from '@/lib/services/paystack.service'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Payment Verify API: Starting payment verification...')
    
    // Verify authentication
    const authResult = await verifyPaymentAuth(request)
    if (!authResult.success || !authResult.user) {
      console.log('🔍 Payment Verify API: Authentication failed:', authResult.error)
      return createUnauthorizedResponse(authResult.error || 'Authentication failed')
    }

    const { user } = authResult
    const body = await request.json()
    console.log('🔍 Payment Verify API: Request body:', body)

    // Validate request body
    const { reference } = body

    if (!reference) {
      console.log('🔍 Payment Verify API: Missing reference')
      return NextResponse.json(
        { error: { message: 'Payment reference is required' } },
        { status: 400 }
      )
    }

    console.log('🔍 Payment Verify API: Verifying payment with reference:', reference)

    // Verify transaction with Paystack
    try {
      const transactionData = await paystackService.verifyTransaction(reference)
      console.log('🔍 Payment Verify API: Paystack verification successful:', transactionData)

      // Check if transaction is successful
      if (transactionData.status === 'success') {
        console.log('🔍 Payment Verify API: Payment verified successfully')
        
        return NextResponse.json({
          success: true,
          data: {
            id: transactionData.id,
            reference: transactionData.reference,
            amount: transactionData.amount / 100, // Convert from smallest currency unit
            currency: transactionData.currency,
            status: transactionData.status,
            metadata: transactionData.metadata,
            paidAt: transactionData.paid_at,
            channel: transactionData.channel,
            gateway_response: transactionData.gateway_response
          }
        })
      } else {
        console.log('🔍 Payment Verify API: Payment not successful, status:', transactionData.status)
        
        return NextResponse.json({
          success: false,
          error: { 
            message: `Payment not successful. Status: ${transactionData.status}`,
            paystackStatus: transactionData.status
          }
        })
      }
    } catch (paystackError) {
      console.error('🔍 Payment Verify API: Paystack verification failed:', paystackError)
      
      return NextResponse.json({
        success: false,
        error: { 
          message: 'Failed to verify payment with Paystack',
          details: paystackError instanceof Error ? paystackError.message : 'Unknown error'
        }
      }, { status: 500 })
    }

  } catch (error) {
    console.error('🔍 Payment Verify API: Payment verification failed:', error)
    return NextResponse.json(
      { 
        error: { 
          message: error instanceof Error ? error.message : 'Failed to verify payment' 
        } 
      }, 
      { status: 500 }
    )
  }
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({ message: 'CORS preflight successful' }, { status: 200 })
}
