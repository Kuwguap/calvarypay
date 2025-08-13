import { NextRequest, NextResponse } from 'next/server'
import { paystackService } from '@/lib/services/paystack.service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const reference = searchParams.get('reference')
    const trxref = searchParams.get('trxref')

    if (!reference || !trxref) {
      return NextResponse.json(
        { error: { message: 'Missing reference or trxref' } },
        { status: 400 }
      )
    }

    // Verify the transaction with Paystack
    const transaction = await paystackService.verifyTransaction(reference)

    // Log the callback
    console.log('Payment callback received:', {
      reference,
      trxref,
      status: transaction.status,
      amount: transaction.amount,
      currency: transaction.currency,
      timestamp: new Date().toISOString(),
    })

    // Handle successful payment
    if (transaction.status === 'success') {
      // Here you would typically:
      // 1. Update your database with the successful transaction
      // 2. Send confirmation emails
      // 3. Update user balances
      // 4. Create audit logs
      
      console.log('Payment successful:', {
        reference: transaction.reference,
        amount: transaction.amount,
        currency: transaction.currency,
        userId: transaction.metadata?.custom_fields?.find(f => f.variable_name === 'userId')?.value,
        userRole: transaction.metadata?.custom_fields?.find(f => f.variable_name === 'userRole')?.value,
        purpose: transaction.metadata?.custom_fields?.find(f => f.variable_name === 'purpose')?.value,
        timestamp: new Date().toISOString(),
      })
    }

    // Redirect to success/failure page based on status
    const redirectUrl = transaction.status === 'success' 
      ? '/dashboard/payment/success'
      : '/dashboard/payment/failure'

    return NextResponse.redirect(`${request.nextUrl.origin}${redirectUrl}?reference=${reference}&status=${transaction.status}`)
  } catch (error) {
    console.error('Payment callback processing failed:', error)
    
    // Redirect to failure page
    return NextResponse.redirect(`${request.nextUrl.origin}/dashboard/payment/failure?error=verification_failed`)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Handle webhook events from Paystack
    const { event, data } = body

    console.log('Paystack webhook received:', {
      event,
      reference: data?.reference,
      status: data?.status,
      timestamp: new Date().toISOString(),
    })

    switch (event) {
      case 'charge.success':
        // Handle successful charge
        await handleSuccessfulCharge(data)
        break
        
      case 'transfer.success':
        // Handle successful transfer
        await handleSuccessfulTransfer(data)
        break
        
      case 'transfer.failed':
        // Handle failed transfer
        await handleFailedTransfer(data)
        break
        
      default:
        console.log('Unhandled webhook event:', event)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook processing failed:', error)
    return NextResponse.json(
      { error: { message: 'Webhook processing failed' } },
      { status: 500 }
    )
  }
}

async function handleSuccessfulCharge(data: any) {
  try {
    console.log('Processing successful charge:', {
      reference: data.reference,
      amount: data.amount,
      currency: data.currency,
      timestamp: new Date().toISOString(),
    })

    // Here you would:
    // 1. Update user balance
    // 2. Create transaction record
    // 3. Send confirmation
    // 4. Update audit logs
  } catch (error) {
    console.error('Failed to process successful charge:', error)
  }
}

async function handleSuccessfulTransfer(data: any) {
  try {
    console.log('Processing successful transfer:', {
      transferCode: data.transfer_code,
      amount: data.amount,
      currency: data.currency,
      timestamp: new Date().toISOString(),
    })

    // Here you would:
    // 1. Update sender balance
    // 2. Update recipient balance
    // 3. Create transfer record
    // 4. Send notifications
    // 5. Update audit logs
  } catch (error) {
    console.error('Failed to process successful transfer:', error)
  }
}

async function handleFailedTransfer(data: any) {
  try {
    console.log('Processing failed transfer:', {
      transferCode: data.transfer_code,
      amount: data.amount,
      currency: data.currency,
      timestamp: new Date().toISOString(),
    })

    // Here you would:
    // 1. Revert sender balance
    // 2. Create failure record
    // 3. Send failure notification
    // 4. Update audit logs
  } catch (error) {
    console.error('Failed to process failed transfer:', error)
  }
} 