import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { verifyPaymentAuth, verifyPaymentRole, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/auth/payment-auth'
import { EmployeeBalanceService } from '@/lib/services/employee-balance.service'

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Merchant Analytics API: Starting comprehensive analytics fetch...')

    // Verify authentication
    const authResult = await verifyPaymentAuth(request)
    if (!authResult.success || !authResult.user) {
      console.log('📊 Merchant Analytics API: Authentication failed:', authResult.error)
      return createUnauthorizedResponse(authResult.error || 'Authentication failed')
    }

    // Verify user has permission to access analytics
    if (!verifyPaymentRole(authResult.user, ['merchant', 'admin'])) {
      console.log('📊 Merchant Analytics API: Insufficient permissions for user:', authResult.user.role)
      return createForbiddenResponse('Only merchants and admins can access analytics data')
    }

    const { user } = authResult
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')
    const view = searchParams.get('view') || 'overview'

    console.log('📊 Merchant Analytics API: Fetching analytics for merchant:', user.userId, 'days:', days, 'view:', view)

    // 1. Fetch employee transfers from database
    const { data: employeeTransfers, error: transfersError } = await supabaseService.client
      .from('employee_transfers')
      .select(`
        id,
        amount_minor,
        currency,
        status,
        transfer_type,
        created_at,
        processed_at,
        transfer_fee_minor,
        net_amount_minor,
        sender_id,
        recipient_id,
        metadata
      `)
      .eq('sender_company_id', user.userId)
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })

    if (transfersError) {
      console.error('📊 Merchant Analytics API: Error fetching employee transfers:', transfersError)
      return NextResponse.json({ error: 'Failed to fetch transfers' }, { status: 500 })
    }

    // 2. Get employee details for sender/recipient
    const allUserIds = new Set<string>()
    if (employeeTransfers) {
      employeeTransfers.forEach(transfer => {
        if (transfer.sender_id) allUserIds.add(transfer.sender_id)
        if (transfer.recipient_id) allUserIds.add(transfer.recipient_id)
      })
    }

    let userDetails: any[] = []
    if (allUserIds.size > 0) {
      const { data: users, error: usersError } = await supabaseService.client
        .from('calvary_users')
        .select('id, first_name, last_name, email, role, department')
        .in('id', Array.from(allUserIds))

      if (usersError) {
        console.error('📊 Merchant Analytics API: Error fetching user details:', usersError)
      } else {
        userDetails = users || []
      }
    }

    // 3. Get company employees for active count
    const { data: companyEmployees, error: employeesError } = await supabaseService.client
      .from('calvary_users')
      .select('id, is_active')
      .eq('role', 'employee')

    if (employeesError) {
      console.error('📊 Merchant Analytics API: Error fetching employees:', employeesError)
    }

    // 4. Calculate comprehensive analytics based on available data
    const analytics = calculateAnalyticsFromTransfers(employeeTransfers, userDetails, companyEmployees, days)

    console.log('📊 Merchant Analytics API: Analytics calculated:', {
      totalTransactions: analytics.overview.totalTransactions,
      totalRevenue: analytics.overview.totalRevenue,
      totalTransferVolume: analytics.overview.totalTransferVolume,
      activeEmployees: analytics.overview.activeEmployees,
      trendsDataPoints: analytics.trends.daily.length,
      breakdownCategories: analytics.breakdown.byStatus.length
    })

    // Return comprehensive analytics data
    return NextResponse.json(analytics)

  } catch (error) {
    console.error('📊 Merchant Analytics API: Failed to fetch analytics:', error)
    return NextResponse.json(
      {
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch analytics data'
        }
      },
      { status: 500 }
    )
  }
}

function calculateAnalytics(employeeTransfers: any[], userDetails: any[], localTransactions: any[], days: number) {
  const now = new Date()
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

  // Overview calculations
  const totalTransactions = (employeeTransfers?.length || 0) + localTransactions.length
  const totalRevenue = calculateTotalRevenue(employeeTransfers, localTransactions)
  const totalTransferVolume = calculateTotalTransferVolume(employeeTransfers)
  const totalFeesCollected = calculateTotalFees(employeeTransfers)
  const activeEmployees = new Set([
    ...(employeeTransfers?.map(t => t.sender_id) || []),
    ...(employeeTransfers?.map(t => t.recipient_id) || [])
  ]).size

  // Calculate success rate
  const completedTransactions = (employeeTransfers || []).filter(t => t.status === 'completed').length
  const successRate = totalTransactions > 0 ? (completedTransactions / totalTransactions) * 100 : 0

  // Calculate average transaction amount
  const averageTransactionAmount = totalTransactions > 0 ? totalTransferVolume / totalTransactions : 0

  // Calculate monthly growth (simplified)
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()
  const previousMonth = currentMonth === 0 ? 11 : currentMonth - 1
  const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear

  const currentMonthTransactions = (employeeTransfers || []).filter(t => {
    const txDate = new Date(t.created_at)
    return txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear
  })

  const previousMonthTransactions = (employeeTransfers || []).filter(t => {
    const txDate = new Date(t.created_at)
    return txDate.getMonth() === previousMonth && txDate.getFullYear() === previousYear
  })

  const currentMonthVolume = currentMonthTransactions.reduce((sum, t) => sum + (t.amount_minor / 100), 0)
  const previousMonthVolume = previousMonthTransactions.reduce((sum, t) => sum + (t.amount_minor / 100), 0)
  const monthlyGrowth = previousMonthVolume > 0 ? ((currentMonthVolume - previousMonthVolume) / previousMonthVolume) * 100 : 0

  // Trends calculations
  const trends = calculateTrends(employeeTransfers, localTransactions, startDate, now)

  // Breakdown calculations
  const breakdown = calculateBreakdown(employeeTransfers, userDetails, localTransactions)

  // Performance calculations
  const performance = calculatePerformance(employeeTransfers, userDetails, localTransactions)

  return {
    overview: {
      totalTransactions,
      totalRevenue,
      totalTransferVolume,
      totalFeesCollected,
      activeEmployees,
      successRate,
      averageTransactionAmount,
      monthlyGrowth
    },
    trends,
    breakdown,
    performance
  }
}

function calculateTotalRevenue(employeeTransfers: any[], localTransactions: any[]): number {
  let revenue = 0

  // From database transfers
  if (employeeTransfers) {
    employeeTransfers.forEach(transfer => {
      if (transfer.status === 'completed') {
        revenue += transfer.amount_minor / 100
      }
    })
  }

  // From local transactions
  localTransactions.forEach(tx => {
    if (tx.type === 'budget_allocation' && tx.status === 'completed') {
      revenue += Math.abs(tx.amount)
    }
  })

  return revenue
}

function calculateTotalTransferVolume(employeeTransfers: any[]): number {
  if (!employeeTransfers) return 0
  
  return employeeTransfers.reduce((sum, transfer) => {
    return sum + ((transfer.amount_minor || 0) / 100) // Convert from minor units
  }, 0)
}

function calculateTotalFees(employeeTransfers: any[]): number {
  if (!employeeTransfers) return 0
  
  return employeeTransfers.reduce((sum, transfer) => {
    return sum + ((transfer.transfer_fee_minor || 0) / 100) // Convert from minor units
  }, 0)
}

function calculateTrends(employeeTransfers: any[], localTransactions: any[], startDate: Date, endDate: Date) {
  const daily: Array<{ date: string; amount: number; count: number }> = []
  const weekly: Array<{ week: string; amount: number; count: number }> = []
  const monthly: Array<{ month: string; amount: number; count: number }> = []

  // Generate date ranges
  const currentDate = new Date(startDate)
  while (currentDate <= endDate) {
    const dateStr = currentDate.toISOString().split('T')[0]
    const weekStr = getWeekString(currentDate)
    const monthStr = currentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

    // Calculate daily data
    const dailyTransactions = (employeeTransfers || []).filter(t => {
      const txDate = new Date(t.created_at).toISOString().split('T')[0]
      return txDate === dateStr
    })

    const dailyAmount = dailyTransactions.reduce((sum, t) => sum + ((t.amount_minor || 0) / 100), 0)
    daily.push({
      date: dateStr,
      amount: dailyAmount,
      count: dailyTransactions.length
    })

    // Calculate weekly data
    const weekStart = getWeekStart(currentDate)
    const weekEnd = getWeekEnd(currentDate)
    const weeklyTransactions = (employeeTransfers || []).filter(t => {
      const txDate = new Date(t.created_at)
      return txDate >= weekStart && txDate <= weekEnd
    })

    const weeklyAmount = weeklyTransactions.reduce((sum, t) => sum + ((t.amount_minor || 0) / 100), 0)
    weekly.push({
      week: weekStr,
      amount: weeklyAmount,
      count: weeklyTransactions.length
    })

    // Calculate monthly data
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
    const monthlyTransactions = (employeeTransfers || []).filter(t => {
      const txDate = new Date(t.created_at)
      return txDate >= monthStart && txDate <= monthEnd
    })

    const monthlyAmount = monthlyTransactions.reduce((sum, t) => sum + ((t.amount_minor || 0) / 100), 0)
    monthly.push({
      month: monthStr,
      amount: monthlyAmount,
      count: monthlyTransactions.length
    })

    currentDate.setDate(currentDate.getDate() + 1)
  }

  return { daily, weekly, monthly }
}

function calculateBreakdown(employeeTransfers: any[], userDetails: any[], localTransactions: any[]) {
  // Status breakdown
  const byStatus = new Map<string, { count: number; amount: number }>()
  if (employeeTransfers) {
    employeeTransfers.forEach(transfer => {
      const status = transfer.status
      const amount = (transfer.amount_minor || 0) / 100 // Convert from minor units
      
      if (!byStatus.has(status)) {
        byStatus.set(status, { count: 0, amount: 0 })
      }
      
      const current = byStatus.get(status)!
      current.count++
      current.amount += amount
    })
  }

  // Type breakdown
  const byType = new Map<string, { count: number; amount: number }>()
  if (employeeTransfers) {
    employeeTransfers.forEach(transfer => {
      const type = transfer.transfer_type
      const amount = transfer.amount_minor / 100
      
      if (!byType.has(type)) {
        byType.set(type, { count: 0, amount: 0 })
      }
      
      const current = byType.get(type)!
      current.count++
      current.amount += amount
    })
  }

  // Employee breakdown
  const byEmployee = new Map<string, { count: number; amount: number }>()
  if (employeeTransfers) {
    employeeTransfers.forEach(transfer => {
      const sender = userDetails.find(u => u.id === transfer.sender_id)
      const recipient = userDetails.find(u => u.id === transfer.recipient_id)
      
      if (sender) {
        const employeeName = `${sender.first_name} ${sender.last_name}`
        if (!byEmployee.has(employeeName)) {
          byEmployee.set(employeeName, { count: 0, amount: 0 })
        }
        
        const current = byEmployee.get(employeeName)!
        current.count++
        current.amount += transfer.amount_minor / 100
      }
    })
  }

  // Category breakdown
  const byCategory = new Map<string, { count: number; amount: number }>()
  if (employeeTransfers) {
    employeeTransfers.forEach(transfer => {
      const category = transfer.metadata?.category || 'transfer'
      const amount = transfer.amount_minor / 100
      
      if (!byCategory.has(category)) {
        byCategory.set(category, { count: 0, amount: 0 })
      }
      
      const current = byCategory.get(category)!
      current.count++
      current.amount += amount
    })
  }

  return {
    byStatus: Array.from(byStatus.entries()).map(([status, data]) => ({
      status,
      count: data.count,
      amount: data.amount
    })),
    byType: Array.from(byType.entries()).map(([type, data]) => ({
      type,
      count: data.count,
      amount: data.amount
    })),
    byEmployee: Array.from(byEmployee.entries()).map(([employee, data]) => ({
      employee,
      count: data.count,
      amount: data.amount
    })).sort((a, b) => b.amount - a.amount).slice(0, 10),
    byCategory: Array.from(byCategory.entries()).map(([category, data]) => ({
      category,
      count: data.count,
      amount: data.amount
    }))
  }
}

function calculatePerformance(employeeTransfers: any[], userDetails: any[], localTransactions: any[]) {
  // Top performers
  const employeeStats = new Map<string, { transactions: number; amount: number; successCount: number }>()
  
  if (employeeTransfers) {
    employeeTransfers.forEach(transfer => {
      const sender = userDetails.find(u => u.id === transfer.sender_id)
      if (sender) {
        const employeeName = `${sender.first_name} ${sender.last_name}`
        
        if (!employeeStats.has(employeeName)) {
          employeeStats.set(employeeName, { transactions: 0, amount: 0, successCount: 0 })
        }
        
        const current = employeeStats.get(employeeName)!
        current.transactions++
        current.amount += transfer.amount_minor / 100
        if (transfer.status === 'completed') {
          current.successCount++
        }
      }
    })
  }

  const topPerformers = Array.from(employeeStats.entries())
    .map(([employee, stats]) => ({
      employee,
      transactions: stats.transactions,
      amount: stats.amount,
      successRate: stats.transactions > 0 ? (stats.successCount / stats.transactions) * 100 : 0
    }))
    .sort((a, b) => b.successRate - a.successRate)
    .slice(0, 5)

  // Risk metrics
  const failedTransactions = (employeeTransfers || []).filter(t => t.status === 'failed').length
  const pendingTransactions = (employeeTransfers || []).filter(t => t.status === 'pending').length
  
  // Calculate average processing time
  let totalProcessingTime = 0
  let completedCount = 0
  
  if (employeeTransfers) {
    employeeTransfers.forEach(transfer => {
      if (transfer.status === 'completed' && transfer.processed_at && transfer.created_at) {
        const created = new Date(transfer.created_at)
        const processed = new Date(transfer.processed_at)
        totalProcessingTime += processed.getTime() - created.getTime()
        completedCount++
      }
    })
  }
  
  const averageProcessingTime = completedCount > 0 ? totalProcessingTime / completedCount / (1000 * 60 * 60) : 0

  // Calculate compliance score
  const totalTransactions = (employeeTransfers?.length || 0) + localTransactions.length
  const complianceScore = totalTransactions > 0 ? 
    Math.max(0, 100 - (failedTransactions * 5) - (pendingTransactions * 2)) : 100

  // Determine risk level
  let riskLevel = 'Low'
  if (complianceScore < 70) riskLevel = 'High'
  else if (complianceScore < 85) riskLevel = 'Medium'

  return {
    topPerformers,
    riskMetrics: {
      failedTransactions,
      pendingTransactions,
      averageProcessingTime,
      complianceScore
    }
  }
}

function getWeekString(date: Date): string {
  const startOfWeek = getWeekStart(date)
  const endOfWeek = getWeekEnd(date)
  return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  return new Date(d.setDate(diff))
}

function getWeekEnd(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? 0 : 7)
  return new Date(d.setDate(diff))
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { error: { message: 'Method not allowed' } },
    { status: 405 }
  )
}
