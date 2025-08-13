import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { authService } from '@/lib/services/auth.service'

export async function GET(request: NextRequest) {
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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    // Get merchant's company ID
    const companyId = user.userId

    // Fetch recent transactions for the company
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select(`
        id,
        reference,
        amount,
        currency,
        status,
        description,
        created_at,
        metadata,
        users!inner(
          id,
          first_name,
          last_name,
          email,
          company_id
        )
      `)
      .eq('users.company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (transactionsError) {
      console.error('Recent transactions fetch error:', transactionsError)
      return NextResponse.json(
        { error: { message: 'Failed to fetch recent transactions' } },
        { status: 500 }
      )
    }

    // Format the response
    const formattedTransactions = transactions.map(transaction => ({
      id: transaction.id,
      reference: transaction.reference,
      employee: `${transaction.users.first_name} ${transaction.users.last_name}`,
      employeeEmail: transaction.users.email,
      amount: transaction.amount,
      currency: transaction.currency,
      status: transaction.status,
      description: transaction.description,
      createdAt: transaction.created_at,
      category: transaction.metadata?.category || 'other'
    }))

    // Log the access
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.userId,
        action: 'recent_transactions_accessed',
        resource_type: 'transactions',
        resource_id: 'merchant_recent_transactions',
        details: {
          limit,
          companyId,
          transactionCount: formattedTransactions.length
        }
      })

    return NextResponse.json({
      transactions: formattedTransactions,
      total: formattedTransactions.length
    })

  } catch (error) {
    console.error('Merchant recent transactions error:', error)
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
