import { NextRequest, NextResponse } from 'next/server'
import { enhancedAuthMiddleware } from '@/lib/auth/enhanced-auth.middleware'
import { supabaseService } from '@/lib/supabase'
import { BalanceService } from '@/lib/services/balance.service'

export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const authResult = await enhancedAuthMiddleware.authenticateRequest(request)
    if (!authResult.authenticated) {
      return authResult.response
    }

    // Only allow merchants and admins
    if (!['merchant', 'admin'].includes(authResult.user.role)) {
      return NextResponse.json(
        { error: 'Access denied. Merchant or admin role required.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const type = searchParams.get('type') // Optional filter by transaction type
    const days = parseInt(searchParams.get('days') || '30') // Filter by recent days

    console.log('🔍 Merchant Transactions API: Fetching transactions for company:', authResult.user.userId)

    // Calculate date filter
    const dateFilter = new Date()
    dateFilter.setDate(dateFilter.getDate() - days)

    // For now, we'll use the existing employee_transfers table and EmployeeBalanceService
    // TODO: When database migration is run, switch to using the new transactions table
    
    // Get transfers where company is sender or recipient
    const { data: transfers, error: transfersError } = await supabaseService.client
      .from('employee_transfers')
      .select(`
        id,
        transfer_reference,
        amount_minor,
        currency,
        sender_id,
        recipient_id,
        reason,
        description,
        status,
        created_at,
        processed_at,
        calvary_users!employee_transfers_sender_id_fkey(first_name, last_name, email, role),
        calvary_users!employee_transfers_recipient_id_fkey(first_name, last_name, email, role)
      `)
      .or(`sender_id.eq.${authResult.user.userId},recipient_id.eq.${authResult.user.userId}`)
      .gte('created_at', dateFilter.toISOString())
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (transfersError) {
      console.error('🔍 Merchant Transactions API: Error fetching transfers:', transfersError)
      return NextResponse.json(
        { error: 'Failed to fetch transfers' },
        { status: 500 }
      )
    }

    // Get company balance data for additional transaction history
    let companyTransactions: any[] = []
    try {
      const balanceData = BalanceService.getBalance(authResult.user.userId)
      // TODO: Implement company transaction history when available
    } catch (error) {
      console.log('🔍 Merchant Transactions API: Could not fetch company transactions:', error)
    }

    // Format transfers for frontend
    const formattedTransactions = (transfers || []).map(tx => ({
      id: tx.id,
      reference: tx.transfer_reference,
      type: tx.sender_id === authResult.user.userId ? 'transfer_sent' : 'transfer_received',
      amount: tx.amount_minor / 100, // Convert from minor units
      currency: tx.currency,
      isIncoming: tx.recipient_id === authResult.user.userId,
      sender: tx.calvary_users ? {
        name: `${tx.calvary_users.first_name} ${tx.calvary_users.last_name}`,
        email: tx.calvary_users.email,
        role: tx.calvary_users.role
      } : null,
      recipient: tx.calvary_users ? {
        name: `${tx.calvary_users.first_name} ${tx.calvary_users.last_name}`,
        email: tx.calvary_users.email,
        role: tx.calvary_users.role
      } : null,
      reason: tx.reason,
      description: tx.description,
      status: tx.status,
      timestamp: tx.created_at,
      processedAt: tx.processed_at
    }))

    // Calculate summary statistics
    const summary = {
      totalTransactions: formattedTransactions.length,
      totalIncoming: formattedTransactions.filter(tx => tx.isIncoming).length,
      totalOutgoing: formattedTransactions.filter(tx => !tx.isIncoming).length,
      totalAmount: formattedTransactions.reduce((sum, tx) => sum + tx.amount, 0),
      totalFees: formattedTransactions.reduce((sum, tx) => {
        // Calculate fees based on transaction type
        if (tx.type === 'transfer_sent') {
          return sum + (tx.amount * 0.01) // 1% fee
        }
        return sum
      }, 0)
    }

    console.log('🔍 Merchant Transactions API: Successfully fetched transactions:', {
      count: formattedTransactions.length,
      summary
    })

    return NextResponse.json({
      transactions: formattedTransactions,
      summary,
      total: formattedTransactions.length,
      limit,
      offset,
      hasMore: false, // Simplified for now
      dateFilter: dateFilter.toISOString()
    })

  } catch (error) {
    console.error('🔍 Merchant Transactions API: Unexpected error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
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
