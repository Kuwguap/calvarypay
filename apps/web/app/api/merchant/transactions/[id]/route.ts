import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { authService } from '@/lib/services/auth.service'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: { message: 'Authorization token required' } },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    
    // Verify token and get user
    const user = await authService.verifyToken(token)
    if (!user) {
      return NextResponse.json(
        { error: { message: 'Invalid or expired token' } },
        { status: 401 }
      )
    }

    // Only allow merchants to access this endpoint
    if (user.role !== 'merchant') {
      return NextResponse.json(
        { error: { message: 'Access denied. Merchant role required.' } },
        { status: 403 }
      )
    }

    const transactionId = params.id

    // Parse request body
    const body = await request.json()
    const { action } = body

    // Validate action
    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: { message: 'Invalid action. Must be "approve" or "reject"' } },
        { status: 400 }
      )
    }

    // Get merchant's company ID
    const companyId = user.userId

    // First, verify the transaction belongs to the merchant's company
    const { data: transaction, error: fetchError } = await supabase
      .from('transactions')
      .select(`
        id,
        status,
        amount,
        currency,
        description,
        users!inner(
          id,
          first_name,
          last_name,
          email,
          company_id
        )
      `)
      .eq('id', transactionId)
      .eq('users.company_id', companyId)
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
    const { data: updatedTransaction, error: updateError } = await supabase
      .from('transactions')
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
      console.error('Transaction update error:', updateError)
      return NextResponse.json(
        { error: { message: 'Failed to update transaction' } },
        { status: 500 }
      )
    }

    // Log the approval/rejection
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.userId,
        action: `transaction_${action}d`,
        resource_type: 'transaction',
        resource_id: transactionId,
        details: {
          transactionId,
          action,
          previousStatus: transaction.status,
          newStatus,
          amount: transaction.amount,
          currency: transaction.currency,
          employeeId: transaction.users.id,
          employeeName: `${transaction.users.first_name} ${transaction.users.last_name}`,
          companyId
        }
      })

    // If approved, you might want to trigger payment processing here
    // For now, we'll just update the status

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
    console.error('Transaction update error:', error)
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: { message: 'Authorization token required' } },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    
    // Verify token and get user
    const user = await authService.verifyToken(token)
    if (!user) {
      return NextResponse.json(
        { error: { message: 'Invalid or expired token' } },
        { status: 401 }
      )
    }

    // Only allow merchants to access this endpoint
    if (user.role !== 'merchant') {
      return NextResponse.json(
        { error: { message: 'Access denied. Merchant role required.' } },
        { status: 403 }
      )
    }

    const transactionId = params.id
    const companyId = user.userId

    // Fetch the transaction with employee details
    const { data: transaction, error: fetchError } = await supabase
      .from('transactions')
      .select(`
        id,
        reference,
        amount,
        currency,
        status,
        description,
        channel,
        created_at,
        updated_at,
        metadata,
        users!inner(
          id,
          first_name,
          last_name,
          email,
          company_id
        )
      `)
      .eq('id', transactionId)
      .eq('users.company_id', companyId)
      .single()

    if (fetchError || !transaction) {
      return NextResponse.json(
        { error: { message: 'Transaction not found or access denied' } },
        { status: 404 }
      )
    }

    // Format the response
    const formattedTransaction = {
      id: transaction.id,
      reference: transaction.reference,
      employee: `${transaction.users.first_name} ${transaction.users.last_name}`,
      employeeEmail: transaction.users.email,
      amount: transaction.amount,
      currency: transaction.currency,
      status: transaction.status,
      description: transaction.description,
      category: transaction.metadata?.category || 'other',
      channel: transaction.channel,
      createdAt: transaction.created_at,
      updatedAt: transaction.updated_at,
      metadata: transaction.metadata
    }

    // Log the access
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.userId,
        action: 'transaction_viewed',
        resource_type: 'transaction',
        resource_id: transactionId,
        details: {
          transactionId,
          companyId
        }
      })

    return NextResponse.json({
      transaction: formattedTransaction
    })

  } catch (error) {
    console.error('Transaction fetch error:', error)
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: { message: 'Method not allowed' } },
    { status: 405 }
  )
}
