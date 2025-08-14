import { NextRequest, NextResponse } from 'next/server'
import { enhancedAuthMiddleware } from '@/lib/auth/enhanced-auth.middleware'
import { supabaseService } from '@/lib/supabase'
import { EmployeeBalanceService } from '@/lib/services/employee-balance.service'

export async function GET(request: NextRequest) {
  try {
    const authResult = await enhancedAuthMiddleware.authenticateRequest(request)
    if (!authResult.authenticated) {
      return authResult.response
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')

    console.log('🔍 Employee Transactions API: Starting transaction fetch for user:', authResult.user.userId)

    // Test database connection first
    try {
      console.log('🔍 Employee Transactions API: Testing database connection...')
      
      const { data: testData, error: testError } = await supabaseService.client
        .from('employee_transfers')
        .select('count')
        .limit(1)
      
      if (testError) {
        console.error('🔍 Employee Transactions API: Database connection test failed:', testError)
        console.error('🔍 Employee Transactions API: Error details:', {
          code: testError.code,
          message: testError.message,
          details: testError.details,
          hint: testError.hint
        })
        
        // Try to get table info to see what's available
        try {
          console.log('🔍 Employee Transactions API: Attempting to get available tables...')
          const { data: tables, error: tablesError } = await supabaseService.client
            .from('information_schema.tables')
            .select('table_name')
            .eq('table_schema', 'public')
          
          if (!tablesError && tables) {
            console.log('🔍 Employee Transactions API: Available tables:', tables.map(t => t.table_name))
          } else if (tablesError) {
            console.error('🔍 Employee Transactions API: Error getting table info:', tablesError)
          }
        } catch (tableInfoError) {
          console.log('🔍 Employee Transactions API: Could not get table info:', tableInfoError)
        }
        
        return NextResponse.json(
          { error: `Database connection failed: ${testError.message}` },
          { status: 500 }
        )
      }
      
      console.log('🔍 Employee Transactions API: Database connection test successful')
    } catch (connectionError) {
      console.error('🔍 Employee Transactions API: Database connection error:', connectionError)
      return NextResponse.json(
        { error: 'Database connection error' },
        { status: 500 }
      )
    }

    // For now, we'll use the existing employee_transfers table and EmployeeBalanceService
    // TODO: When database migration is run, switch to using the new transactions table
    
    // Get transfers where user is sender or recipient
    console.log('🔍 Employee Transactions API: Fetching transfers from database...')
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
        processed_at
      `)
      .or(`sender_id.eq.${authResult.user.userId},recipient_id.eq.${authResult.user.userId}`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (transfersError) {
      console.error('🔍 Employee Transactions API: Error fetching transfers:', transfersError)
      return NextResponse.json(
        { error: 'Failed to fetch transfers' },
        { status: 500 }
      )
    }

    console.log('🔍 Employee Transactions API: Successfully fetched transfers:', {
      count: transfers?.length || 0,
      userId: authResult.user.userId
    })

    // Get user details for sender and recipient IDs
    const userIds = new Set<string>()
    if (transfers) {
      transfers.forEach(tx => {
        if (tx.sender_id) userIds.add(tx.sender_id)
        if (tx.recipient_id) userIds.add(tx.recipient_id)
      })
    }

    console.log('🔍 Employee Transactions API: Fetching user details for IDs:', Array.from(userIds))

    let userDetails: Record<string, any> = {}
    if (userIds.size > 0) {
      const { data: users, error: usersError } = await supabaseService.client
        .from('calvary_users')
        .select('id, first_name, last_name, email')
        .in('id', Array.from(userIds))

      if (usersError) {
        console.error('🔍 Employee Transactions API: Error fetching user details:', usersError)
        // Continue without user details rather than failing completely
      } else if (users) {
        users.forEach(user => {
          userDetails[user.id] = user
        })
        console.log('🔍 Employee Transactions API: Successfully fetched user details for:', users.length, 'users')
      }
    }

    // Get balance service transactions for additional transaction history
    let balanceTransactions: any[] = []
    try {
      const balanceData = EmployeeBalanceService.getEmployeeBalance(authResult.user.userId)
      balanceTransactions = balanceData.transactions || []
      console.log('🔍 Employee Transactions API: Successfully fetched balance transactions:', balanceTransactions.length)
    } catch (error) {
      console.log('🔍 Employee Transactions API: Could not fetch balance transactions:', error)
      // Continue without balance transactions
    }

    // Format transfers for frontend
    const formattedTransactions = (transfers || []).map(tx => ({
      id: tx.id,
      reference: tx.transfer_reference,
      type: tx.sender_id === authResult.user.userId ? 'transfer_sent' : 'transfer_received',
      amount: tx.amount_minor / 100, // Convert from minor units
      currency: tx.currency,
      isIncoming: tx.recipient_id === authResult.user.userId,
      sender: tx.sender_id ? {
        name: `${userDetails[tx.sender_id]?.first_name} ${userDetails[tx.sender_id]?.last_name}`,
        email: userDetails[tx.sender_id]?.email
      } : null,
      recipient: tx.recipient_id ? {
        name: `${userDetails[tx.recipient_id]?.first_name} ${userDetails[tx.recipient_id]?.last_name}`,
        email: userDetails[tx.recipient_id]?.email
      } : null,
      reason: tx.reason,
      description: tx.description,
      status: tx.status,
      timestamp: tx.created_at,
      processedAt: tx.processed_at
    }))

    // Format balance service transactions
    const formattedBalanceTransactions = balanceTransactions.map(tx => ({
      id: tx.id || `balance_${tx.reference}`,
      reference: tx.reference,
      type: tx.type,
      amount: tx.amount,
      currency: 'GHS',
      isIncoming: tx.type === 'credit' || tx.type === 'budget_allocation' || tx.type === 'transfer_received',
      sender: null,
      recipient: null,
      reason: '',
      description: tx.description,
      status: 'completed',
      timestamp: tx.timestamp,
      processedAt: tx.timestamp
    }))

    // Combine and sort all transactions
    const allTransactions = [...formattedTransactions, ...formattedBalanceTransactions]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)

    console.log('🔍 Employee Transactions API: Successfully fetched transactions:', {
      count: allTransactions.length,
      transfersCount: formattedTransactions.length,
      balanceCount: formattedBalanceTransactions.length
    })

    return NextResponse.json({
      transactions: allTransactions,
      total: allTransactions.length,
      limit,
      offset,
      hasMore: false // Simplified for now
    })

  } catch (error) {
    console.error('🔍 Employee Transactions API: Unexpected error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    )
  }
} 