import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { verifyPaymentAuth, verifyPaymentRole, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/auth/payment-auth'
import { BalanceService } from '@/lib/services/balance.service'

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Dashboard Stats API: Starting stats fetch...')

    // Verify authentication
    const authResult = await verifyPaymentAuth(request)
    if (!authResult.success || !authResult.user) {
      console.log('📊 Dashboard Stats API: Authentication failed:', authResult.error)
      return createUnauthorizedResponse(authResult.error || 'Authentication failed')
    }

    // Verify user has permission to view dashboard stats
    if (!verifyPaymentRole(authResult.user, ['merchant', 'admin'])) {
      console.log('📊 Dashboard Stats API: Insufficient permissions for user:', authResult.user.role)
      return createForbiddenResponse('Only merchants and admins can view dashboard stats')
    }

    const { user } = authResult
    console.log('📊 Dashboard Stats API: Fetching stats for user:', user.userId)

    // Fetch total employees
    const { count: activeEmployees, error: employeesError } = await supabaseService.client
      .from('calvary_users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'employee')
      .eq('is_active', true)

    if (employeesError) {
      console.error('📊 Dashboard Stats API: Error fetching employees:', employeesError)
    }

    // Get account balance from the shared balance service
    const balanceData = BalanceService.getBalance(user.userId)
    const accountBalance = balanceData.balance
    
    // Get debug info for troubleshooting
    const debugInfo = BalanceService.getDebugInfo()
    
    console.log('📊 Dashboard Stats API: Account balance from balance service:', accountBalance)
    console.log('📊 Dashboard Stats API: Balance data details:', balanceData)
    console.log('📊 Dashboard Stats API: Debug info:', {
      totalCompanies: debugInfo.totalCompanies,
      fileExists: debugInfo.fileExists,
      filePath: debugInfo.filePath,
      allBalances: debugInfo.balances
    })

    // TODO: Implement when transactions table is created
    // For now, return placeholder values
    const totalTransactions = 0
    const totalRevenue = 0
    const pendingApprovals = 0
    const successRate = 0
    const monthlyGrowth = 0

    console.log('📊 Dashboard Stats API: Stats calculated:', {
      totalTransactions,
      totalRevenue,
      activeEmployees: activeEmployees || 0,
      pendingApprovals,
      successRate,
      monthlyGrowth,
      accountBalance
    })

    // Return dashboard statistics
    return NextResponse.json({
      totalTransactions: totalTransactions || 0,
      totalRevenue: totalRevenue || 0,
      activeEmployees: activeEmployees || 0,
      pendingApprovals: pendingApprovals || 0,
      successRate: successRate || 0,
      monthlyGrowth: monthlyGrowth || 0,
      accountBalance: accountBalance
    })

  } catch (error) {
    console.error('📊 Dashboard Stats API: Failed to fetch dashboard stats:', error)
    return NextResponse.json(
      {
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch dashboard stats'
        }
      },
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
