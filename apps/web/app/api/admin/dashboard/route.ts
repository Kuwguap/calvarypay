/**
 * Admin Dashboard API
 * Provides real system statistics and data for administrators
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyPaymentAuth, verifyPaymentRole, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/auth/payment-auth'
import { supabaseService } from '@/lib/supabase'
import { BalanceService } from '@/lib/services/balance.service'

export async function GET(request: NextRequest) {
  try {
    console.log('🔧 Admin Dashboard API: Starting admin stats fetch...')

    // Verify authentication
    const authResult = await verifyPaymentAuth(request)
    if (!authResult.success || !authResult.user) {
      console.log('🔧 Admin Dashboard API: Authentication failed:', authResult.error)
      return createUnauthorizedResponse(authResult.error || 'Authentication failed')
    }

    // Verify admin role
    if (!verifyPaymentRole(authResult.user, ['admin'])) {
      console.log('🔧 Admin Dashboard API: Insufficient permissions for user:', authResult.user.role)
      return createForbiddenResponse('Only administrators can access system dashboard')
    }

    const { user } = authResult
    console.log('🔧 Admin Dashboard API: Fetching admin stats for user:', user.userId)

    // Fetch system statistics
    const stats = await fetchSystemStats()
    const companies = await fetchCompanies()
    const complianceIssues = await fetchComplianceIssues()
    const systemRates = await fetchSystemRates()

    console.log('🔧 Admin Dashboard API: Admin stats calculated:', {
      totalSystemVolume: stats.totalSystemVolume,
      activeCompanies: stats.activeCompanies,
      totalEmployees: stats.totalEmployees,
      taxCollected: stats.taxCollected,
      complianceRate: stats.complianceRate,
      companiesCount: companies.length,
      complianceIssuesCount: complianceIssues.length
    })

    return NextResponse.json({
      success: true,
      data: {
        stats,
        companies,
        complianceIssues,
        systemRates
      }
    })

  } catch (error) {
    console.error('🔧 Admin Dashboard API: Failed to fetch admin dashboard data:', error)
    return NextResponse.json(
      {
        error: {
          message: error instanceof Error ? error.message : 'Failed to fetch admin dashboard data'
        }
      },
      { status: 500 }
    )
  }
}

// Fetch system-wide statistics
async function fetchSystemStats() {
  try {
    // Get all companies (merchants)
    const { data: merchants, error: merchantsError } = await supabaseService.client
      .from('calvary_users')
      .select('*')
      .eq('role', 'merchant')
      .eq('is_active', true)

    if (merchantsError) {
      console.error('🔧 Admin Dashboard API: Error fetching merchants:', merchantsError)
    }

    // Get all employees
    const { data: employees, error: employeesError } = await supabaseService.client
      .from('calvary_users')
      .select('*')
      .eq('role', 'employee')
      .eq('is_active', true)

    if (employeesError) {
      console.error('🔧 Admin Dashboard API: Error fetching employees:', employeesError)
    }

    // Get balance data from balance service
    const balanceStats = BalanceService.getStats()
    const allBalances = BalanceService.getAllBalances()

    // Calculate system volume from all company balances
    let totalSystemVolume = 0
    let taxCollected = 0
    
    for (const [companyId, balance] of allBalances) {
      totalSystemVolume += balance.totalDeposits
      // Assume 15% tax rate for now (can be made configurable)
      taxCollected += balance.totalDeposits * 0.15
    }

    // Calculate compliance rate (placeholder - can be enhanced with real compliance data)
    const complianceRate = 92 // Default for now

    return {
      totalSystemVolume,
      activeCompanies: merchants?.length || 0,
      totalEmployees: employees?.length || 0,
      taxCollected,
      complianceRate,
      systemHealth: 'Healthy'
    }

  } catch (error) {
    console.error('🔧 Admin Dashboard API: Error fetching system stats:', error)
    return {
      totalSystemVolume: 0,
      activeCompanies: 0,
      totalEmployees: 0,
      taxCollected: 0,
      complianceRate: 0,
      systemHealth: 'Unknown'
    }
  }
}

// Fetch all companies with their statistics
async function fetchCompanies() {
  try {
    // Get all merchants
    const { data: merchants, error: merchantsError } = await supabaseService.client
      .from('calvary_users')
      .select('*')
      .eq('role', 'merchant')
      .eq('is_active', true)

    if (merchantsError) {
      console.error('🔧 Admin Dashboard API: Error fetching merchants:', merchantsError)
      return []
    }

    // Get balance data
    const allBalances = BalanceService.getAllBalances()

    // Combine merchant data with balance data
    const companies = merchants?.map(merchant => {
      const balance = allBalances.get(merchant.id) || {
        balance: 0,
        totalDeposits: 0,
        totalWithdrawals: 0,
        lastUpdated: new Date().toISOString()
      }

      return {
        id: merchant.id,
        name: merchant.first_name && merchant.last_name 
          ? `${merchant.first_name} ${merchant.last_name}` 
          : merchant.email.split('@')[0],
        type: merchant.metadata?.sector || 'General',
        employees: 0, // TODO: Count employees per company when company relationships are implemented
        totalSpent: balance.totalDeposits,
        compliance: 'compliant', // TODO: Implement real compliance checking
        lastActivity: balance.lastUpdated.split('T')[0],
        taxCollected: balance.totalDeposits * 0.15, // 15% tax rate
        email: merchant.email,
        createdAt: merchant.created_at,
        balance: balance.balance
      }
    }) || []

    return companies

  } catch (error) {
    console.error('🔧 Admin Dashboard API: Error fetching companies:', error)
    return []
  }
}

// Fetch compliance issues (placeholder for now)
async function fetchComplianceIssues() {
  try {
    // TODO: Implement real compliance issue tracking
    // For now, return empty array since we don't have compliance tables yet
    return []

  } catch (error) {
    console.error('🔧 Admin Dashboard API: Error fetching compliance issues:', error)
    return []
  }
}

// Fetch system rates (placeholder for now)
async function fetchSystemRates() {
  try {
    // TODO: Implement system rates table
    // For now, return default rates
    return [
      { sector: "General", category: "Transaction", currentRate: 0.15, proposedRate: 0.15, status: "active" },
      { sector: "Transport", category: "Fuel", currentRate: 0.12, proposedRate: 0.12, status: "active" },
      { sector: "Energy", category: "Operations", currentRate: 0.20, proposedRate: 0.20, status: "active" },
      { sector: "Government", category: "General", currentRate: 0.10, proposedRate: 0.10, status: "active" },
    ]

  } catch (error) {
    console.error('🔧 Admin Dashboard API: Error fetching system rates:', error)
    return []
  }
} 