import { NextRequest, NextResponse } from 'next/server'
import { enhancedAuthMiddleware } from '@/lib/auth/enhanced-auth.middleware'
import { supabaseService } from '@/lib/supabase'
import { EmployeeBalanceService } from '@/lib/services/employee-balance.service'
import { validationService } from '@/lib/services/validation.service'

export async function GET(request: NextRequest) {
  try {
    // Authenticate the request
    const authResult = await enhancedAuthMiddleware.authenticateRequest(request)
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ users: [] })
    }

    console.log('🔍 Transfer API: Searching for users with query:', query)

    // Search for users (excluding the current user)
    const { data: users, error } = await supabaseService.client
      .from('calvary_users')
      .select('id, email, first_name, last_name, role, is_active')
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
      .eq('is_active', true)
      .neq('id', authResult.user.userId)
      .limit(10)

    if (error) {
      console.error('🔍 Transfer API: Error searching users:', error)
      return NextResponse.json({ error: 'Failed to search users' }, { status: 500 })
    }

    // Format users for frontend
    const formattedUsers = (users || []).map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      displayName: `${user.first_name} ${user.last_name}`,
      role: user.role,
      isActive: user.is_active
    }))

    console.log('🔍 Transfer API: Found users:', formattedUsers.length)

    return NextResponse.json({ users: formattedUsers })
  } catch (error) {
    console.error('🔍 Transfer API: Uncaught error:', error)
    return NextResponse.json(
      { error: 'Failed to search users due to an unexpected error' },
      { status: 500 }
    )
  }
}

// POST: Initiate a transfer
export async function POST(request: NextRequest) {
  try {
    // Authenticate the request
    const authResult = await enhancedAuthMiddleware.authenticateRequest(request)
    if (!authResult.authenticated) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 })
    }

    const body = await request.json()
    
    // Use comprehensive validation service
    const validationResult = validationService.validateEmployeeTransfer(body)
    
    if (!validationResult.isValid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.errors },
        { status: 400 }
      )
    }

    const { amount, currency, recipientId, reason, description } = validationResult.validatedData!
    const { fee, totalAmount } = validationResult

    console.log('🔍 Transfer API: Processing transfer:', {
      senderId: authResult.user.userId,
      recipientId,
      amount,
      currency,
      reason,
      fee,
      totalAmount
    })

    // Get sender and recipient details
    const { data: sender, error: senderError } = await supabaseService.client
      .from('calvary_users')
      .select('id, email, first_name, last_name, role')
      .eq('id', authResult.user.userId)
      .single()

    if (senderError || !sender) {
      console.error('🔍 Transfer API: Failed to get sender details:', senderError)
      return NextResponse.json(
        { error: 'Failed to get sender details' },
        { status: 500 }
      )
    }

    const { data: recipient, error: recipientError } = await supabaseService.client
      .from('calvary_users')
      .select('id, email, first_name, last_name, role')
      .eq('id', recipientId)
      .single()

    if (recipientError || !recipient) {
      console.error('🔍 Transfer API: Failed to get recipient details:', recipientError)
      return NextResponse.json(
        { error: 'Recipient not found' },
        { status: 404 }
      )
    }

    // Validate recipient eligibility
    const eligibilityCheck = validationService.validateRecipientEligibility(
      recipient.role,
      null, // recipientCompanyId - not implemented yet
      null  // senderCompanyId - not implemented yet
    )

    if (!eligibilityCheck.isValid) {
      return NextResponse.json(
        { error: eligibilityCheck.error },
        { status: 400 }
      )
    }
    
    // Check if sender has sufficient balance (including fee)
    const senderBalanceData = EmployeeBalanceService.getEmployeeBalance(authResult.user.userId)
    if (senderBalanceData.balance < totalAmount!) {
      return NextResponse.json(
        { error: `Insufficient balance. Required: ${totalAmount!.toFixed(2)} GHS (${amount.toFixed(2)} + ${fee!.toFixed(2)} fee), Available: ${senderBalanceData.balance.toFixed(2)} GHS` },
        { status: 400 }
      )
    }

    // Convert to minor units (pesewas for GHS)
    const amountMinor = Math.round(amount * 100)
    const transferFeeMinor = Math.round(fee! * 100)
    const netAmountMinor = amountMinor - transferFeeMinor

    // Create transfer record
    const transferId = crypto.randomUUID()
    const transferReference = `TRF_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`
    
    const { error: transferError } = await supabaseService.client
      .from('employee_transfers')
      .insert({
        id: transferId,
        transfer_reference: transferReference,
        amount_minor: amountMinor,
        currency: currency,
        sender_id: authResult.user.userId,
        sender_company_id: authResult.user.userId, // Temporary - should be actual company ID
        recipient_id: recipientId,
        recipient_company_id: null, // Not implemented yet
        reason: reason,
        description: description || reason,
        transfer_type: 'employee_to_employee',
        status: 'completed',
        processed_at: new Date().toISOString(),
        transfer_fee_minor: transferFeeMinor,
        net_amount_minor: netAmountMinor,
        created_by: authResult.user.userId,
        metadata: {
          senderEmail: sender.email,
          senderName: `${sender.first_name} ${sender.last_name}`,
          recipientEmail: recipient.email,
          recipientName: `${recipient.first_name} ${recipient.last_name}`,
          transferMethod: 'api',
          timestamp: new Date().toISOString()
        }
      })

    if (transferError) {
      console.error('🔍 Transfer API: Failed to create transfer record:', transferError)
      return NextResponse.json(
        { error: 'Failed to create transfer record' },
        { status: 500 }
      )
    }

    // Create audit log entry
    const { error: auditError } = await supabaseService.client
      .from('transfer_audit_log')
      .insert({
        transfer_id: transferId,
        action: 'transfer_created',
        actor_id: authResult.user.userId,
        actor_role: sender.role,
        details: {
          amount: amount,
          currency: currency,
          fee: fee,
          totalAmount: totalAmount,
          reason: reason,
          recipientId: recipientId,
          recipientName: `${recipient.first_name} ${recipient.last_name}`
        },
        timestamp: new Date().toISOString()
      })

    if (auditError) {
      console.error('🔍 Transfer API: Failed to create audit log:', auditError)
      // Don't fail the transfer if audit logging fails
    }

    // Update balances using the service
    try {
      // Debit sender
      EmployeeBalanceService.updateEmployeeBalance(
        authResult.user.userId, 
        senderBalanceData.balance - totalAmount!
      )
      
      // Credit recipient
      const recipientBalanceData = EmployeeBalanceService.getEmployeeBalance(recipientId)
      EmployeeBalanceService.updateEmployeeBalance(
        recipientId, 
        recipientBalanceData.balance + amount
      )
      
      // Log transactions for both users
      EmployeeBalanceService.addTransactionToLog(
        authResult.user.userId,
        'transfer_sent',
        amount,
        `Transfer to ${recipient.first_name} ${recipient.last_name}`,
        transferReference
      )
      
      EmployeeBalanceService.addTransactionToLog(
        recipientId,
        'transfer_received',
        amount,
        `Transfer from ${sender.first_name} ${sender.last_name}`,
        transferReference
      )
      
      console.log('🔍 Transfer API: Transfer completed successfully:', {
        transferId,
        reference: transferReference,
        amount,
        fee,
        totalAmount
      })
      
      return NextResponse.json({
        success: true,
        transferId,
        reference: transferReference,
        amount,
        fee,
        totalAmount,
        message: 'Transfer completed successfully'
      })
      
    } catch (balanceError) {
      console.error('🔍 Transfer API: Failed to update balances:', balanceError)
      
      // Rollback transfer status to failed
      await supabaseService.client
        .from('employee_transfers')
        .update({ status: 'failed' })
        .eq('id', transferId)
      
      return NextResponse.json(
        { error: 'Transfer failed due to balance update error' },
        { status: 500 }
      )
    }
    
  } catch (error) {
    console.error('🔍 Transfer API: Uncaught error:', error)
    return NextResponse.json(
      { error: 'Transfer failed due to an unexpected error' },
      { status: 500 }
    )
  }
} 