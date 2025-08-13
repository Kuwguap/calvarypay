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
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'
    const category = searchParams.get('category') || 'all'
    const days = parseInt(searchParams.get('days') || '30')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get merchant's company ID
    const companyId = user.userId

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - days)

    // Build query
    let query = supabase
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
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false })

    // Apply filters
    if (search) {
      query = query.or(`reference.ilike.%${search}%,description.ilike.%${search}%,users.first_name.ilike.%${search}%,users.last_name.ilike.%${search}%,users.email.ilike.%${search}%`)
    }

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    if (category !== 'all') {
      query = query.contains('metadata', { category })
    }

    // Apply pagination
    if (limit > 0) {
      query = query.range(offset, offset + limit - 1)
    }

    const { data: transactions, error: transactionsError } = await query

    if (transactionsError) {
      console.error('Transactions fetch error:', transactionsError)
      return NextResponse.json(
        { error: { message: 'Failed to fetch transactions' } },
        { status: 500 }
      )
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('users.company_id', companyId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    // Apply same filters to count query
    if (search) {
      countQuery = countQuery.or(`reference.ilike.%${search}%,description.ilike.%${search}%,users.first_name.ilike.%${search}%,users.last_name.ilike.%${search}%,users.email.ilike.%${search}%`)
    }

    if (status !== 'all') {
      countQuery = countQuery.eq('status', status)
    }

    if (category !== 'all') {
      countQuery = countQuery.contains('metadata', { category })
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      console.error('Count fetch error:', countError)
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
      category: transaction.metadata?.category || 'other',
      channel: transaction.channel,
      createdAt: transaction.created_at,
      metadata: transaction.metadata
    }))

    // Log the access
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.userId,
        action: 'transactions_accessed',
        resource_type: 'transactions',
        resource_id: 'merchant_transactions',
        details: {
          search,
          status,
          category,
          days,
          limit,
          offset,
          companyId,
          transactionCount: formattedTransactions.length
        }
      })

    return NextResponse.json({
      transactions: formattedTransactions,
      total: count || 0,
      limit,
      offset,
      hasMore: (count || 0) > offset + limit
    })

  } catch (error) {
    console.error('Merchant transactions error:', error)
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
