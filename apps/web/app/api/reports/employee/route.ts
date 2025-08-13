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

    // Only allow employees to access this endpoint
    if (user.role !== 'employee') {
      return NextResponse.json(
        { error: { message: 'Access denied. Employee role required.' } },
        { status: 403 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')
    const reportType = searchParams.get('type') || 'summary'

    // Calculate date range
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - days)

    // Fetch transactions for the user within the date range
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.userId)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())
      .order('created_at', { ascending: false })

    if (transactionsError) {
      console.error('Transactions fetch error:', transactionsError)
      return NextResponse.json(
        { error: { message: 'Failed to fetch transactions' } },
        { status: 500 }
      )
    }

    // Calculate summary statistics
    const summary = {
      totalTransactions: transactions.length,
      totalAmount: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      pendingTransactions: 0,
      averageTransactionAmount: 0
    }

    transactions.forEach(transaction => {
      summary.totalAmount += transaction.amount || 0
      
      switch (transaction.status) {
        case 'completed':
        case 'success':
          summary.successfulTransactions++
          break
        case 'failed':
        case 'error':
          summary.failedTransactions++
          break
        case 'pending':
          summary.pendingTransactions++
          break
      }
    })

    summary.averageTransactionAmount = summary.totalTransactions > 0 
      ? summary.totalAmount / summary.totalTransactions 
      : 0

    // Calculate category breakdown
    const categoryMap = new Map<string, { count: number; amount: number }>()
    
    transactions.forEach(transaction => {
      const category = transaction.metadata?.category || 'other'
      const existing = categoryMap.get(category) || { count: 0, amount: 0 }
      categoryMap.set(category, {
        count: existing.count + 1,
        amount: existing.amount + (transaction.amount || 0)
      })
    })

    const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      count: data.count,
      amount: data.amount,
      percentage: summary.totalAmount > 0 ? (data.amount / summary.totalAmount) * 100 : 0
    })).sort((a, b) => b.amount - a.amount)

    // Calculate monthly trends (for the last 12 months if range is large enough)
    const monthlyTrends: Array<{ month: string; transactions: number; amount: number }> = []
    
    if (days >= 30) {
      const monthsToShow = Math.min(12, Math.ceil(days / 30))
      
      for (let i = monthsToShow - 1; i >= 0; i--) {
        const monthDate = new Date()
        monthDate.setMonth(monthDate.getMonth() - i)
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
        
        const monthTransactions = transactions.filter(t => {
          const transactionDate = new Date(t.created_at)
          return transactionDate >= monthStart && transactionDate <= monthEnd
        })
        
        monthlyTrends.push({
          month: monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          transactions: monthTransactions.length,
          amount: monthTransactions.reduce((sum, t) => sum + (t.amount || 0), 0)
        })
      }
    }

    // Get recent transactions (limit to 10 for the report)
    const recentTransactions = transactions.slice(0, 10).map(transaction => ({
      id: transaction.id,
      reference: transaction.reference,
      amount: transaction.amount,
      currency: transaction.currency,
      status: transaction.status,
      description: transaction.description,
      createdAt: transaction.created_at,
      category: transaction.metadata?.category
    }))

    // Build response based on report type
    let responseData = {
      summary,
      categoryBreakdown: [],
      monthlyTrends: [],
      recentTransactions: []
    }

    switch (reportType) {
      case 'summary':
        responseData = {
          summary,
          categoryBreakdown: categoryBreakdown.slice(0, 5), // Top 5 categories
          monthlyTrends: [],
          recentTransactions: recentTransactions.slice(0, 5)
        }
        break
        
      case 'detailed':
        responseData = {
          summary,
          categoryBreakdown,
          monthlyTrends,
          recentTransactions
        }
        break
        
      case 'category':
        responseData = {
          summary,
          categoryBreakdown,
          monthlyTrends: [],
          recentTransactions: []
        }
        break
        
      case 'trends':
        responseData = {
          summary,
          categoryBreakdown: [],
          monthlyTrends,
          recentTransactions: []
        }
        break
        
      default:
        responseData = {
          summary,
          categoryBreakdown: categoryBreakdown.slice(0, 5),
          monthlyTrends: monthlyTrends.slice(-6), // Last 6 months
          recentTransactions: recentTransactions.slice(0, 5)
        }
    }

    // Log the report access
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.userId,
        action: 'report_accessed',
        resource_type: 'report',
        resource_id: `employee_report_${reportType}`,
        details: {
          reportType,
          dateRange: days,
          transactionCount: transactions.length
        }
      })

    return NextResponse.json(responseData)

  } catch (error) {
    console.error('Employee report error:', error)
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
