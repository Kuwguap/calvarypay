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

    // Get merchant's company ID (assuming user.userId is the company owner)
    const companyId = user.userId

    // Calculate date ranges
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    // Fetch all transactions for the company (from employees)
    const { data: allTransactions, error: transactionsError } = await supabase
      .from('transactions')
      .select(`
        *,
        users!inner(company_id)
      `)
      .eq('users.company_id', companyId)
      .order('created_at', { ascending: false })

    if (transactionsError) {
      console.error('Transactions fetch error:', transactionsError)
      return NextResponse.json(
        { error: { message: 'Failed to fetch transactions' } },
        { status: 500 }
      )
    }

    // Fetch company employees
    const { data: employees, error: employeesError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, is_active, last_login')
      .eq('company_id', companyId)
      .eq('role', 'employee')

    if (employeesError) {
      console.error('Employees fetch error:', employeesError)
      return NextResponse.json(
        { error: { message: 'Failed to fetch employees' } },
        { status: 500 }
      )
    }

    // Calculate statistics
    const totalTransactions = allTransactions.length
    const totalRevenue = allTransactions.reduce((sum, t) => sum + (t.amount || 0), 0)
    const activeEmployees = employees.filter(emp => emp.is_active).length
    
    // Count pending approvals (transactions with pending status)
    const pendingApprovals = allTransactions.filter(t => t.status === 'pending').length
    
    // Calculate success rate
    const completedTransactions = allTransactions.filter(t => 
      ['completed', 'success'].includes(t.status)
    ).length
    const successRate = totalTransactions > 0 ? (completedTransactions / totalTransactions) * 100 : 0

    // Calculate monthly growth
    const currentMonthTransactions = allTransactions.filter(t => 
      new Date(t.created_at) >= startOfMonth
    )
    const lastMonthTransactions = allTransactions.filter(t => {
      const date = new Date(t.created_at)
      return date >= startOfLastMonth && date <= endOfLastMonth
    })

    const currentMonthRevenue = currentMonthTransactions.reduce((sum, t) => sum + (t.amount || 0), 0)
    const lastMonthRevenue = lastMonthTransactions.reduce((sum, t) => sum + (t.amount || 0), 0)
    
    const monthlyGrowth = lastMonthRevenue > 0 
      ? ((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
      : 0

    // Prepare response
    const stats = {
      totalTransactions,
      totalRevenue,
      activeEmployees,
      pendingApprovals,
      successRate,
      monthlyGrowth
    }

    // Log the dashboard access
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.userId,
        action: 'dashboard_accessed',
        resource_type: 'dashboard',
        resource_id: 'merchant_dashboard',
        details: {
          statsRequested: true,
          companyId
        }
      })

    return NextResponse.json(stats)

  } catch (error) {
    console.error('Merchant dashboard stats error:', error)
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
