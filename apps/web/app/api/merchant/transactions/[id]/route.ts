import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { verifyPaymentAuth, verifyPaymentRole, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/auth/payment-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('📊 Merchant Transaction Details API: Starting transaction fetch...')

    // Verify authentication
    const authResult = await verifyPaymentAuth(request)
    if (!authResult.success || !authResult.user) {
      console.log('📊 Merchant Transaction Details API: Authentication failed:', authResult.error)
      return createUnauthorizedResponse(authResult.error || 'Authentication failed')
    }

    // Verify user has permission to access transaction details
    if (!verifyPaymentRole(authResult.user, ['merchant', 'admin'])) {
      console.log('📊 Merchant Transaction Details API: Insufficient permissions for user:', authResult.user.role)
      return createForbiddenResponse('Only merchants and admins can access transaction details')
    }

    const { user } = authResult
    const transactionId = params.id

    if (!transactionId) {
      return NextResponse.json(
        { error: { message: 'Transaction ID is required' } },
        { status: 400 }
      )
    }

    console.log('📊 Merchant Transaction Details API: Fetching transaction:', transactionId)

    // Get merchant's company ID
    const companyId = user.userId

    // Fetch the transaction from employee_transfers table
    const { data: transaction, error: fetchError } = await supabaseService.client
      .from('employee_transfers')
      .select(`
        id,
        transfer_reference,
        amount_minor,
        currency,
        status,
        transfer_type,
        reason,
        description,
        created_at,
        processed_at,
        transfer_fee_minor,
        net_amount_minor,
        sender_id,
        recipient_id,
        metadata
      `)
      .eq('id', transactionId)
      .or(`sender_company_id.eq.${companyId},recipient_company_id.eq.${companyId}`)
      .single()

    if (fetchError || !transaction) {
      console.log('📊 Merchant Transaction Details API: Transaction not found or access denied:', fetchError)
      return NextResponse.json(
        { error: { message: 'Transaction not found or access denied' } },
        { status: 404 }
      )
    }

    // Get sender and recipient details
    const { data: sender, error: senderError } = await supabaseService.client
      .from('calvary_users')
      .select('id, first_name, last_name, email, role')
      .eq('id', transaction.sender_id)
      .single()

    const { data: recipient, error: recipientError } = await supabaseService.client
      .from('calvary_users')
      .select('id, first_name, last_name, email, role')
      .eq('id', transaction.recipient_id)
      .single()

    if (senderError || recipientError) {
      console.error('📊 Merchant Transaction Details API: Error fetching user details:', { senderError, recipientError })
    }

    // Format the response
    const formattedTransaction = {
      id: transaction.id,
      reference: transaction.transfer_reference,
      amount: transaction.amount_minor / 100,
      currency: transaction.currency,
      status: transaction.status,
      type: transaction.transfer_type,
      reason: transaction.reason,
      description: transaction.description,
      createdAt: transaction.created_at,
      processedAt: transaction.processed_at,
      fee: transaction.transfer_fee_minor ? transaction.transfer_fee_minor / 100 : 0,
      netAmount: transaction.net_amount_minor ? transaction.net_amount_minor / 100 : 0,
      sender: sender ? {
        id: sender.id,
        name: `${sender.first_name} ${sender.last_name}`,
        email: sender.email,
        role: sender.role
      } : null,
      recipient: recipient ? {
        id: recipient.id,
        name: `${recipient.first_name} ${recipient.last_name}`,
        email: recipient.email,
        role: recipient.role
      } : null,
      metadata: transaction.metadata
    }

    console.log('📊 Merchant Transaction Details API: Transaction fetched successfully')

    return NextResponse.json({
      transaction: formattedTransaction
    })

  } catch (error) {
    console.error('📊 Merchant Transaction Details API: Failed to fetch transaction:', error)
    return NextResponse.json(
      {
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch transaction details'
        }
      },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('📊 Merchant Transaction Update API: Starting transaction update...')

    // Verify authentication
    const authResult = await verifyPaymentAuth(request)
    if (!authResult.success || !authResult.user) {
      console.log('📊 Merchant Transaction Update API: Authentication failed:', authResult.error)
      return createUnauthorizedResponse(authResult.error || 'Authentication failed')
    }

    // Verify user has permission to update transactions
    if (!verifyPaymentRole(authResult.user, ['merchant', 'admin'])) {
      console.log('📊 Merchant Transaction Update API: Insufficient permissions for user:', authResult.user.role)
      return createForbiddenResponse('Only merchants and admins can update transactions')
    }

    const { user } = authResult
    const transactionId = params.id
    const { action } = await request.json()

    if (!transactionId || !action) {
      return NextResponse.json(
        { error: { message: 'Transaction ID and action are required' } },
        { status: 400 }
      )
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: { message: 'Invalid action. Must be "approve" or "reject"' } },
        { status: 400 }
      )
    }

    console.log('📊 Merchant Transaction Update API: Updating transaction:', transactionId, 'action:', action)

    // Get merchant's company ID
    const companyId = user.userId

    // First, verify the transaction belongs to the merchant's company
    const { data: transaction, error: fetchError } = await supabaseService.client
      .from('employee_transfers')
      .select(`
        id,
        status,
        amount_minor,
        currency,
        reason,
        sender_id,
        recipient_id
      `)
      .eq('id', transactionId)
      .or(`sender_company_id.eq.${companyId},recipient_company_id.eq.${companyId}`)
      .single()

    if (fetchError || !transaction) {
      return NextResponse.json(
        { error: { message: 'Transaction not found or access denied' } },
        { status: 404 }
      )
    }

    // Check if transaction is in a state that can be updated
    if (!['pending'].includes(transaction.status)) {
      return NextResponse.json(
        { error: { message: 'Transaction cannot be updated in its current state' } },
        { status: 400 }
      )
    }

    // Determine new status based on action
    const newStatus = action === 'approve' ? 'approved' : 'rejected'

    // Update the transaction
    const { data: updatedTransaction, error: updateError } = await supabaseService.client
      .from('employee_transfers')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
        metadata: {
          ...transaction.metadata,
          approved_by: user.userId,
          approved_at: new Date().toISOString(),
          approval_action: action
        }
      })
      .eq('id', transactionId)
      .select()
      .single()

    if (updateError) {
      console.error('📊 Merchant Transaction Update API: Transaction update error:', updateError)
      return NextResponse.json(
        { error: { message: 'Failed to update transaction' } },
        { status: 500 }
      )
    }

    // Log the approval/rejection
    await supabaseService.client
      .from('transfer_audit_log')
      .insert({
        transfer_id: transactionId,
        action: `transaction_${action}d`,
        user_id: user.userId,
        details: {
          transactionId,
          action,
          previousStatus: transaction.status,
          newStatus,
          amount: transaction.amount_minor / 100,
          currency: transaction.currency,
          senderId: transaction.sender_id,
          recipientId: transaction.recipient_id,
          companyId
        },
        created_at: new Date().toISOString()
      })

    console.log('📊 Merchant Transaction Update API: Transaction updated successfully')

    return NextResponse.json({
      success: true,
      transaction: {
        id: updatedTransaction.id,
        status: updatedTransaction.status,
        action,
        updatedAt: updatedTransaction.updated_at
      }
    })

  } catch (error) {
    console.error('📊 Merchant Transaction Update API: Failed to update transaction:', error)
    return NextResponse.json(
      {
        error: {
          message: error instanceof Error ? error.message : 'Failed to update transaction'
        }
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('📊 Merchant Transaction Delete API: Starting transaction deletion...')

    // Verify authentication
    const authResult = await verifyPaymentAuth(request)
    if (!authResult.success || !authResult.user) {
      console.log('📊 Merchant Transaction Delete API: Authentication failed:', authResult.error)
      return createUnauthorizedResponse(authResult.error || 'Authentication failed')
    }

    // Verify user has permission to delete transactions
    if (!verifyPaymentRole(authResult.user, ['merchant', 'admin'])) {
      console.log('📊 Merchant Transaction Delete API: Insufficient permissions for user:', authResult.user.role)
      return createForbiddenResponse('Only merchants and admins can delete transactions')
    }

    const { user } = authResult
    const transactionId = params.id

    if (!transactionId) {
      return NextResponse.json(
        { error: { message: 'Transaction ID is required' } },
        { status: 400 }
      )
    }

    console.log('📊 Merchant Transaction Delete API: Deleting transaction:', transactionId)

    // Get merchant's company ID
    const companyId = user.userId

    // First, verify the transaction belongs to the merchant's company
    const { data: transaction, error: fetchError } = await supabaseService.client
      .from('employee_transfers')
      .select('id, status')
      .eq('id', transactionId)
      .or(`sender_company_id.eq.${companyId},recipient_company_id.eq.${companyId}`)
      .single()

    if (fetchError || !transaction) {
      return NextResponse.json(
        { error: { message: 'Transaction not found or access denied' } },
        { status: 404 }
      )
    }

    // Check if transaction can be deleted (only pending or failed transactions)
    if (!['pending', 'failed'].includes(transaction.status)) {
      return NextResponse.json(
        { error: { message: 'Transaction cannot be deleted in its current state' } },
        { status: 400 }
      )
    }

    // Soft delete by updating status to 'deleted'
    const { error: deleteError } = await supabaseService.client
      .from('employee_transfers')
      .update({
        status: 'deleted',
        updated_at: new Date().toISOString(),
        metadata: {
          ...transaction.metadata,
          deleted_by: user.userId,
          deleted_at: new Date().toISOString()
        }
      })
      .eq('id', transactionId)

    if (deleteError) {
      console.error('📊 Merchant Transaction Delete API: Transaction deletion error:', deleteError)
      return NextResponse.json(
        { error: { message: 'Failed to delete transaction' } },
        { status: 500 }
      )
    }

    // Log the deletion
    await supabaseService.client
      .from('transfer_audit_log')
      .insert({
        transfer_id: transactionId,
        action: 'transaction_deleted',
        user_id: user.userId,
        details: {
          transactionId,
          previousStatus: transaction.status,
          companyId
        },
        created_at: new Date().toISOString()
      })

    console.log('📊 Merchant Transaction Delete API: Transaction deleted successfully')

    return NextResponse.json({
      success: true,
      message: 'Transaction deleted successfully'
    })

  } catch (error) {
    console.error('📊 Merchant Transaction Delete API: Failed to delete transaction:', error)
    return NextResponse.json(
      {
        error: {
          message: error instanceof Error ? error.message : 'Failed to delete transaction'
        }
      },
      { status: 500 }
    )
  }
}
