import { NextRequest, NextResponse } from 'next/server'
import { paystackService } from '@/lib/services/paystack.service'
import { verifyPaymentAuth, verifyPaymentRole, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/auth/payment-auth'
import { supabaseService } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('💰 Deposit API: Starting deposit initialization...')
    
    // Verify authentication
    const authResult = await verifyPaymentAuth(request)
    console.log('💰 Deposit API: Auth result:', {
      success: authResult.success,
      hasUser: !!authResult.user,
      userRole: authResult.user?.role
    })
    
    if (!authResult.success || !authResult.user) {
      console.log('💰 Deposit API: Authentication failed:', authResult.error)
      return createUnauthorizedResponse(authResult.error || 'Authentication failed')
    }

    // Verify user has permission to make deposits
    if (!verifyPaymentRole(authResult.user, ['employee', 'merchant', 'admin'])) {
      console.log('💰 Deposit API: Insufficient permissions for user:', authResult.user.role)
      return createForbiddenResponse('Insufficient permissions for deposit operations')
    }

    const { user } = authResult
    const body = await request.json()
    console.log('💰 Deposit API: Request body:', body)

    // Validate request body
    const { amount, currency, purpose, employeeId, budgetType } = body

    if (!amount || amount <= 0) {
      console.log('💰 Deposit API: Invalid amount:', amount)
      return NextResponse.json(
        { error: { message: 'Invalid amount' } },
        { status: 400 }
      )
    }

    if (!currency) {
      console.log('💰 Deposit API: Missing currency')
      return NextResponse.json(
        { error: { message: 'Currency is required' } },
        { status: 400 }
      )
    }

    // Enhanced purpose validation for company operations
    const validPurposes = ['deposit', 'transfer', 'company_deposit', 'employee_budget', 'company_budget']
    if (!purpose || !validPurposes.includes(purpose)) {
      console.log('💰 Deposit API: Invalid purpose:', purpose)
      return NextResponse.json(
        { error: { message: `Invalid purpose. Must be one of: ${validPurposes.join(', ')}` } },
        { status: 400 }
      )
    }

    // Company-specific validations
    if (purpose === 'employee_budget' && user.role === 'merchant') {
      if (!employeeId) {
        return NextResponse.json(
          { error: { message: 'Employee ID is required for budget allocation' } },
          { status: 400 }
        )
      }
      
      // Verify employee exists and belongs to the company
      const { data: employeeData, error: employeeError } = await supabaseService.client
        .from('calvary_users')
        .select('id, email, first_name, last_name, role')
        .eq('id', employeeId)
        .eq('role', 'employee')
        .single()

      if (employeeError || !employeeData) {
        return NextResponse.json(
          { error: { message: 'Invalid employee ID or employee not found' } },
          { status: 400 }
        )
      }
    }

    // Fetch actual user data from database to get correct email
    console.log('💰 Deposit API: Fetching user data from database...')
    const { data: userData, error: userError } = await supabaseService.client
      .from('calvary_users')
      .select('email, first_name, last_name')
      .eq('id', user.userId)
      .single()

    if (userError || !userData) {
      console.error('💰 Deposit API: Failed to fetch user data:', userError)
      return NextResponse.json(
        { error: { message: 'Failed to fetch user information' } },
        { status: 500 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(userData.email)) {
      console.error('💰 Deposit API: Invalid email format in database:', userData.email)
      return NextResponse.json(
        { error: { message: 'Invalid email format in user profile' } },
        { status: 400 }
      )
    }

    console.log('💰 Deposit API: User data fetched:', {
      email: userData.email,
      firstName: userData.first_name,
      lastName: userData.last_name
    })

    // Generate unique reference
    const reference = `calvary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    console.log('💰 Deposit API: Generated reference:', reference)

    // Prepare deposit data with validated email from database
    const depositData = {
      amount: parseFloat(amount),
      currency: currency.toUpperCase(),
      email: userData.email, // Use email from database, not JWT token
      reference,
      metadata: {
        userId: user.userId,
        userRole: user.role,
        purpose,
        timestamp: new Date().toISOString(),
        // Additional metadata for company operations
        ...(purpose === 'employee_budget' && { 
          employeeId, 
          budgetType: budgetType || 'general',
          allocatedBy: user.userId 
        }),
        ...(purpose === 'company_deposit' && { 
          companyId: user.userId,
          depositType: 'company_fund'
        })
      },
    }
    console.log('💰 Deposit API: Prepared deposit data:', depositData)

    // Initialize deposit with Paystack
    console.log('💰 Deposit API: Calling Paystack service...')
    const depositResult = await paystackService.initializeDeposit(depositData)
    console.log('💰 Deposit API: Paystack result:', depositResult)

    // Log the deposit attempt
    console.log('Deposit initialized:', {
      userId: user.userId,
      userRole: user.role,
      amount,
      currency,
      purpose,
      reference: depositResult.reference,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      data: {
        authorizationUrl: depositResult.authorizationUrl,
        reference: depositResult.reference,
        accessCode: depositResult.accessCode,
        amount,
        currency,
        purpose,
      },
    })
  } catch (error) {
    console.error('💰 Deposit API: Deposit initialization failed:', error)
    return NextResponse.json(
      { 
        error: { 
          message: error instanceof Error ? error.message : 'Failed to initialize deposit' 
        } 
      },
      { status: 500 }
    )
  }
} 