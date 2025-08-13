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
    const days = parseInt(searchParams.get('days') || '30')
    const view = searchParams.get('view') || 'overview'

    // Get merchant's company ID
    const companyId = user.userId

    // Calculate date ranges
    const now = new Date()
    const startDate = new Date()
    startDate.setDate(now.getDate() - days)
    
    const previousStartDate = new Date()
    previousStartDate.setDate(startDate.getDate() - days)

    // Fetch all transactions for the company
    const { data: allTransactions, error: transactionsError } = await supabase
      .from('transactions')
      .select(`
        *,
        users!inner(
          id,
          first_name,
          last_name,
          email,
          company_id,
          metadata
        )
      `)
      .eq('users.company_id', companyId)
      .gte('created_at', previousStartDate.toISOString())
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
      .select('id, first_name, last_name, email, is_active, last_login, metadata')
      .eq('company_id', companyId)
      .eq('role', 'employee')

    if (employeesError) {
      console.error('Employees fetch error:', employeesError)
      return NextResponse.json(
        { error: { message: 'Failed to fetch employees' } },
        { status: 500 }
      )
    }

    // Filter transactions by date ranges
    const currentPeriodTransactions = allTransactions.filter(t => 
      new Date(t.created_at) >= startDate
    )
    const previousPeriodTransactions = allTransactions.filter(t => {
      const date = new Date(t.created_at)
      return date >= previousStartDate && date < startDate
    })

    // Calculate overview metrics
    const totalRevenue = currentPeriodTransactions.reduce((sum, t) => sum + (t.amount || 0), 0)
    const totalTransactions = currentPeriodTransactions.length
    const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0
    const activeEmployees = employees.filter(emp => emp.is_active).length

    // Calculate growth rate
    const previousRevenue = previousPeriodTransactions.reduce((sum, t) => sum + (t.amount || 0), 0)
    const growthRate = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0

    // Calculate conversion rate (successful transactions / total transactions)
    const successfulTransactions = currentPeriodTransactions.filter(t => 
      ['completed', 'success'].includes(t.status)
    ).length
    const conversionRate = totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0

    // Calculate category breakdown
    const categoryMap = new Map<string, { amount: number; count: number }>()
    const previousCategoryMap = new Map<string, { amount: number; count: number }>()

    currentPeriodTransactions.forEach(transaction => {
      const category = transaction.metadata?.category || 'other'
      const existing = categoryMap.get(category) || { amount: 0, count: 0 }
      categoryMap.set(category, {
        amount: existing.amount + (transaction.amount || 0),
        count: existing.count + 1
      })
    })

    previousPeriodTransactions.forEach(transaction => {
      const category = transaction.metadata?.category || 'other'
      const existing = previousCategoryMap.get(category) || { amount: 0, count: 0 }
      previousCategoryMap.set(category, {
        amount: existing.amount + (transaction.amount || 0),
        count: existing.count + 1
      })
    })

    const categories = Array.from(categoryMap.entries()).map(([category, data]) => {
      const previousData = previousCategoryMap.get(category) || { amount: 0, count: 0 }
      const growth = previousData.amount > 0 ? ((data.amount - previousData.amount) / previousData.amount) * 100 : 0
      
      return {
        category,
        amount: data.amount,
        count: data.count,
        percentage: totalRevenue > 0 ? (data.amount / totalRevenue) * 100 : 0,
        growth
      }
    }).sort((a, b) => b.amount - a.amount)

    // Calculate employee performance
    const employeePerformance = employees.map(employee => {
      const employeeTransactions = currentPeriodTransactions.filter(t => t.users.id === employee.id)
      const totalSpent = employeeTransactions.reduce((sum, t) => sum + (t.amount || 0), 0)
      const transactionCount = employeeTransactions.length
      
      // Calculate efficiency (successful transactions / total transactions)
      const successfulCount = employeeTransactions.filter(t => 
        ['completed', 'success'].includes(t.status)
      ).length
      const efficiency = transactionCount > 0 ? (successfulCount / transactionCount) * 100 : 0

      return {
        id: employee.id,
        name: `${employee.first_name} ${employee.last_name}`,
        department: employee.metadata?.department || 'Unassigned',
        totalSpent,
        transactionCount,
        efficiency,
        lastActive: employee.last_login
      }
    }).sort((a, b) => b.totalSpent - a.totalSpent)

    // Calculate department analytics
    const departmentMap = new Map<string, {
      employees: number
      totalSpent: number
      transactionCount: number
      categories: Map<string, number>
    }>()

    employees.forEach(employee => {
      const department = employee.metadata?.department || 'Unassigned'
      const employeeTransactions = currentPeriodTransactions.filter(t => t.users.id === employee.id)
      const totalSpent = employeeTransactions.reduce((sum, t) => sum + (t.amount || 0), 0)
      
      const existing = departmentMap.get(department) || {
        employees: 0,
        totalSpent: 0,
        transactionCount: 0,
        categories: new Map()
      }

      existing.employees += 1
      existing.totalSpent += totalSpent
      existing.transactionCount += employeeTransactions.length

      employeeTransactions.forEach(t => {
        const category = t.metadata?.category || 'other'
        const categoryAmount = existing.categories.get(category) || 0
        existing.categories.set(category, categoryAmount + (t.amount || 0))
      })

      departmentMap.set(department, existing)
    })

    const departments = Array.from(departmentMap.entries()).map(([name, data]) => ({
      name,
      budget: 50000, // Default budget - in real app, this would come from settings
      spent: data.totalSpent,
      employees: data.employees,
      efficiency: data.transactionCount > 0 ? 85 : 0, // Simplified efficiency calculation
      topCategories: Array.from(data.categories.entries())
        .map(([category, amount]) => ({ category, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3)
    }))

    // Generate AI insights
    const insights = []

    // Revenue insight
    if (growthRate > 10) {
      insights.push({
        type: 'positive' as const,
        title: 'Strong Revenue Growth',
        description: `Your revenue has grown by ${growthRate.toFixed(1)}% compared to the previous period. Keep up the excellent work!`,
        trend: growthRate
      })
    } else if (growthRate < -5) {
      insights.push({
        type: 'negative' as const,
        title: 'Revenue Decline',
        description: `Revenue has decreased by ${Math.abs(growthRate).toFixed(1)}%. Consider reviewing spending patterns and employee efficiency.`,
        trend: growthRate
      })
    }

    // Top category insight
    if (categories.length > 0) {
      const topCategory = categories[0]
      insights.push({
        type: 'neutral' as const,
        title: 'Top Spending Category',
        description: `${topCategory.category} accounts for ${topCategory.percentage.toFixed(1)}% of total spending with ${topCategory.count} transactions.`,
        value: `${topCategory.percentage.toFixed(1)}%`
      })
    }

    // Employee efficiency insight
    const avgEfficiency = employeePerformance.reduce((sum, emp) => sum + emp.efficiency, 0) / employeePerformance.length
    if (avgEfficiency > 90) {
      insights.push({
        type: 'positive' as const,
        title: 'High Team Efficiency',
        description: `Your team maintains an excellent ${avgEfficiency.toFixed(1)}% success rate on transactions.`,
        value: `${avgEfficiency.toFixed(1)}%`
      })
    }

    // Transaction volume insight
    if (totalTransactions > previousPeriodTransactions.length) {
      const volumeGrowth = ((totalTransactions - previousPeriodTransactions.length) / previousPeriodTransactions.length) * 100
      insights.push({
        type: 'positive' as const,
        title: 'Increased Activity',
        description: `Transaction volume increased by ${volumeGrowth.toFixed(1)}%, indicating higher business activity.`,
        trend: volumeGrowth
      })
    }

    // Prepare response data
    const analyticsData = {
      overview: {
        totalRevenue,
        totalTransactions,
        averageTransactionValue,
        activeEmployees,
        growthRate,
        conversionRate
      },
      trends: {
        daily: [], // Could be implemented for detailed view
        weekly: [], // Could be implemented for detailed view
        monthly: [] // Could be implemented for detailed view
      },
      categories: categories.slice(0, 10), // Top 10 categories
      employees: employeePerformance.slice(0, 10), // Top 10 employees
      departments,
      insights
    }

    // Log the analytics access
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.userId,
        action: 'analytics_accessed',
        resource_type: 'analytics',
        resource_id: 'merchant_analytics',
        details: {
          view,
          dateRange: days,
          companyId,
          transactionCount: totalTransactions
        }
      })

    return NextResponse.json(analyticsData)

  } catch (error) {
    console.error('Merchant analytics error:', error)
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
