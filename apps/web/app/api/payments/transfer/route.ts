import { NextRequest, NextResponse } from 'next/server'
import { paystackService } from '@/lib/services/paystack.service'
import { verifyPaymentAuth, verifyPaymentRole, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/auth/payment-auth'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyPaymentAuth(request)
    if (!authResult.success || !authResult.user) {
      return createUnauthorizedResponse(authResult.error || 'Authentication failed')
    }

    // Verify user has permission to make transfers (only employees)
    if (!verifyPaymentRole(authResult.user, ['employee'])) {
      return createForbiddenResponse('Only employees can make transfers to colleagues')
    }

    const { user } = authResult
    const body = await request.json()

    // Validate request body
    const { amount, currency, recipientId, recipientEmail, reason } = body

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: { message: 'Invalid amount' } },
        { status: 400 }
      )
    }

    if (!currency) {
      return NextResponse.json(
        { error: { message: 'Currency is required' } },
        { status: 400 }
      )
    }

    if (!recipientId || !recipientEmail) {
      return NextResponse.json(
        { error: { message: 'Recipient information is required' } },
        { status: 400 }
      )
    }

    if (!reason) {
      return NextResponse.json(
        { error: { message: 'Transfer reason is required' } },
        { status: 400 }
      )
    }

    // Check if user has sufficient balance (this would be implemented with actual balance checking)
    // For now, we'll allow the transfer and let Paystack handle the balance check

    // Prepare transfer data
    const transferData = {
      amount: parseFloat(amount),
      currency: currency.toUpperCase(),
      recipientId,
      recipientEmail,
      reason,
      metadata: {
        senderId: user.userId,
        senderRole: user.role,
        timestamp: new Date().toISOString()
      },
    }

    // Initiate transfer with Paystack
    const transferResult = await paystackService.initiateTransfer(transferData)

    // Log the transfer attempt
    console.log('Transfer initiated:', {
      senderId: user.userId,
      senderRole: user.role,
      recipientId,
      recipientEmail,
      amount,
      currency,
      reason,
      transferCode: transferResult.transfer_code,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      data: {
        transferId: transferResult.id,
        transferCode: transferResult.transfer_code,
        amount,
        currency,
        recipientId,
        recipientEmail,
        reason,
        status: transferResult.status,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Transfer initiation failed:', error)
    return NextResponse.json(
      { 
        error: { 
          message: error instanceof Error ? error.message : 'Failed to initiate transfer' 
        } 
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyPaymentAuth(request)
    if (!authResult.success || !authResult.user) {
      return createUnauthorizedResponse(authResult.error || 'Authentication failed')
    }

    const { user } = authResult
    const { searchParams } = new URL(request.url)
    const transferCode = searchParams.get('transferCode')

    if (!transferCode) {
      return NextResponse.json(
        { error: { message: 'Transfer code is required' } },
        { status: 400 }
      )
    }

    // Get transfer status from Paystack
    const transferStatus = await paystackService.getTransferStatus(transferCode)

    return NextResponse.json({
      success: true,
      data: transferStatus,
    })
  } catch (error) {
    console.error('Transfer status check failed:', error)
    return NextResponse.json(
      { 
        error: { 
          message: error instanceof Error ? error.message : 'Failed to check transfer status' 
        } 
      },
      { status: 500 }
    )
  }
} 