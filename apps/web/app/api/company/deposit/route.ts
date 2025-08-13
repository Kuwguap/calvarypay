/**
 * Company Deposit API
 * Allows companies/merchants to make deposits to their company account
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyPaymentAuth, verifyPaymentRole, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/auth/payment-auth'
import { paystackService } from '@/lib/services/paystack.service'
import { supabaseService } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('🏢 Company Deposit API: Starting company deposit...')
    
    // Verify authentication
    const authResult = await verifyPaymentAuth(request)
    if (!authResult.success || !authResult.user) {
      console.log('🏢 Company Deposit API: Authentication failed:', authResult.error)
      return createUnauthorizedResponse(authResult.error || 'Authentication failed')
    }

    // Verify user has permission to make company deposits
    if (!verifyPaymentRole(authResult.user, ['merchant', 'admin'])) {
      console.log('🏢 Company Deposit API: Insufficient permissions for user:', authResult.user.role)
      return createForbiddenResponse('Only merchants and admins can make company deposits')
    }

    const { user } = authResult
    const body = await request.json()
    console.log('🏢 Company Deposit API: Request body:', body)

    // Validate request body
    const { amount, currency, purpose, description } = body

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: { message: 'Invalid amount' } },
        { status: 400 }
      )
    }

    if (!currency) {
      return NextResponse.json(
        { error: { message: 'Currency is required' } },
        { status: 400 }
      )
    }

    // Fetch company data from database
    console.log('🏢 Company Deposit API: Fetching company data...')
    const { data: companyData, error: companyError } = await supabaseService.client
      .from('calvary_users')
      .select('email, first_name, last_name')
      .eq('id', user.userId)
      .single()

    if (companyError || !companyData) {
      console.error('🏢 Company Deposit API: Failed to fetch company data:', companyError)
      return NextResponse.json(
        { error: { message: 'Failed to fetch company information' } },
        { status: 500 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(companyData.email)) {
      console.error('🏢 Company Deposit API: Invalid email format in database:', companyData.email)
      return NextResponse.json(
        { error: { message: 'Invalid email format in company profile' } },
        { status: 400 }
      )
    }

    console.log('🏢 Company Deposit API: Company data fetched:', {
      email: companyData.email,
      name: `${companyData.first_name} ${companyData.last_name}`
    })

    // Generate unique reference
    const reference = `company_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    console.log('🏢 Company Deposit API: Generated reference:', reference)

    // Prepare company deposit data
    const depositData = {
      amount: parseFloat(amount),
      currency: currency.toUpperCase(),
      email: companyData.email,
      reference,
      metadata: {
        companyId: user.userId,
        companyName: `${companyData.first_name} ${companyData.last_name}`,
        purpose: purpose || 'company_deposit',
        description: description || 'Company account deposit',
        timestamp: new Date().toISOString(),
        depositType: 'company_fund'
      },
    }
    console.log('🏢 Company Deposit API: Prepared deposit data:', depositData)

    // Initialize deposit with Paystack
    console.log('🏢 Company Deposit API: Calling Paystack service...')
    const depositResult = await paystackService.initializeDeposit(depositData)
    console.log('🏢 Company Deposit API: Paystack result:', depositResult)

    // Log the company deposit attempt
    console.log('Company deposit initialized:', {
      companyId: user.userId,
      companyName: `${companyData.first_name} ${companyData.last_name}`,
      amount,
      currency,
      purpose: purpose || 'company_deposit',
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
        purpose: purpose || 'company_deposit',
        companyName: `${companyData.first_name} ${companyData.last_name}`
      },
    })

  } catch (error) {
    console.error('🏢 Company Deposit API: Company deposit failed:', error)
    return NextResponse.json(
      { 
        error: { 
          message: error instanceof Error ? error.message : 'Failed to initialize company deposit' 
        } 
      }, 
      { status: 500 }
    )
  }
} 