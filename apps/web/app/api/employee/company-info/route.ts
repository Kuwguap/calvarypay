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

    // Get employee's current information including company
    const { data: employee, error: employeeError } = await supabase
      .from('calvary_users')
      .select(`
        id,
        email,
        first_name,
        last_name,
        created_at
      `)
      .eq('id', user.id)
      .single()

    if (employeeError) {
      console.error('Employee fetch error:', employeeError)
      return NextResponse.json(
        { error: { message: 'Failed to fetch employee information' } },
        { status: 500 }
      )
    }

    // Get employee balance and spending information
    const { EmployeeBalanceService } = await import('@/lib/services/employee-balance.service')
    const balanceData = EmployeeBalanceService.getEmployeeBalance(user.id)
    const recentTransactions = EmployeeBalanceService.getTransactionsForUser(user.id, 10)
    
    // Get all employees to calculate team statistics (colleagues)
    const { data: allEmployees, error: colleaguesError } = await supabase
      .from('calvary_users')
      .select('id, email, first_name, last_name, created_at')
      .eq('role', 'employee')
      .eq('is_active', true)
      .neq('id', user.id) // Exclude current user
      .limit(50)

    const colleagues = allEmployees || []
    
    // Calculate spending limit based on recent allocations
    const totalAllocated = balanceData.pendingAllocations.reduce((sum, alloc) => sum + alloc.amount, 0)
    const spendingLimit = balanceData.balance + totalAllocated
    
    // Get department from recent budget allocations (use the most common budget type)
    const budgetTypes = balanceData.pendingAllocations.map(alloc => alloc.budgetType)
    const department = budgetTypes.length > 0 ? budgetTypes[0] : 'General'
    
    return NextResponse.json({
      hasCompany: true, // Changed to true since employee is part of the system
      employee: {
        id: employee.id,
        name: `${employee.first_name || 'John'} ${employee.last_name || 'Doe'}`,
        email: employee.email,
        department: department.charAt(0).toUpperCase() + department.slice(1), // Capitalize first letter
        spendingLimit: spendingLimit,
        joinedAt: employee.created_at,
        currentBalance: balanceData.balance,
        totalReceived: balanceData.totalReceived,
        totalSpent: balanceData.totalSpent,
        pendingAllocations: balanceData.pendingAllocations.length
      },
      company: {
        name: 'CalvaryPay Organization',
        industry: 'Financial Technology',
        employeeCount: colleagues.length + 1, // Include current user
        description: 'Digital payment and financial services platform'
      },
      colleagues: colleagues.map(colleague => ({
        id: colleague.id,
        name: `${colleague.first_name || 'Employee'} ${colleague.last_name || ''}`,
        email: colleague.email,
        department: 'General', // Default for now
        isOnline: Math.random() > 0.5, // Mock online status
        joinedAt: colleague.created_at
      })),
      pendingInvitations: [], // No pending invitations for now
      stats: {
        totalColleagues: colleagues.length,
        onlineColleagues: Math.floor(colleagues.length * 0.6), // Mock 60% online
        pendingInvitations: 0,
        recentTransactions: recentTransactions.length,
        totalSpending: balanceData.totalSpent
      }
    })



  } catch (error) {
    console.error('Employee company info error:', error)
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
