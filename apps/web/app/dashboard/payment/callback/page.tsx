"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, Loader2, DollarSign, ArrowRight, Home } from "lucide-react"
import Link from "next/link"
import { formatCurrency } from "@/lib/utils"

// Types
interface PaymentStatus {
  status: 'loading' | 'success' | 'failed' | 'pending'
  message: string
  transactionData?: any
  error?: string
}

function PaymentCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>({
    status: 'loading',
    message: 'Verifying payment...'
  })

  const reference = searchParams.get('reference') || searchParams.get('trxref')
  const transactionId = searchParams.get('transaction_id')

  useEffect(() => {
    console.log('🔍 Callback: useEffect triggered')
    console.log('🔍 Callback: Reference:', reference)
    console.log('🔍 Callback: User object:', user)
    console.log('🔍 Callback: Access token from hook:', user?.accessToken)
    
    if (!reference) {
      console.log('🔍 Callback: No reference found')
      setPaymentStatus({
        status: 'failed',
        message: 'No payment reference found'
      })
      return
    }

    // Wait for user to be loaded before verifying payment
    if (!user?.accessToken) {
      console.log('🔍 Callback: No access token from hook, checking localStorage...')
      
      // Check localStorage directly
      if (typeof window !== 'undefined') {
        const localToken = localStorage.getItem('calvarypay_access_token') || 
                          localStorage.getItem('auth_token')
        console.log('🔍 Callback: Token from localStorage:', localToken ? 'Found' : 'Not found')
        
        if (localToken) {
          console.log('🔍 Callback: Proceeding with localStorage token')
          verifyPayment(reference)
          return
        }
      }
      
      setPaymentStatus({
        status: 'loading',
        message: 'Loading user session...'
      })
      return
    }

    console.log('🔍 Callback: Proceeding with hook token')
    // Verify the payment with Paystack
    verifyPayment(reference)
  }, [reference, user?.accessToken])

  const verifyPayment = async (ref: string) => {
    try {
      console.log('🔍 Callback: Starting payment verification...')
      console.log('🔍 Callback: User object:', user)
      console.log('🔍 Callback: Access token from hook:', user?.accessToken)
      
      // Try to get access token from multiple sources
      let accessToken = user?.accessToken
      
      if (!accessToken && typeof window !== 'undefined') {
        // Fallback: try to get token directly from localStorage
        accessToken = localStorage.getItem('calvarypay_access_token') || 
                     localStorage.getItem('auth_token')
        console.log('🔍 Callback: Access token from localStorage:', accessToken?.substring(0, 30) + '...')
      }
      
      if (!accessToken) {
        console.error('🔍 Callback: No access token available from any source')
        setPaymentStatus({
          status: 'failed',
          message: 'Authentication token not available. Please log in again.'
        })
        return
      }

      setPaymentStatus({
        status: 'loading',
        message: 'Verifying payment with Paystack...'
      })

      const response = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reference: ref })
      })

      console.log('🔍 Callback: Verification response status:', response.status)

      const result = await response.json()
      console.log('🔍 Callback: Verification result:', result)

      if (response.ok && result.success) {
        setPaymentStatus({
          status: 'success',
          message: 'Payment verified successfully!',
          transactionData: result.data
        })

        // Update account balance
        const balanceUpdate = await updateAccountBalance(result.data)
        
        // Update the success message with balance information
        if (balanceUpdate) {
          setPaymentStatus(prev => ({
            ...prev,
            message: `Payment verified successfully! Your account balance has been updated to ${balanceUpdate.newBalance} ${balanceUpdate.currency}.`
          }))
        }
      } else {
        setPaymentStatus({
          status: 'failed',
          message: result.error?.message || 'Payment verification failed'
        })
      }
    } catch (error) {
      console.error('🔍 Callback: Payment verification error:', error)
      setPaymentStatus({
        status: 'failed',
        message: 'Network error during payment verification'
      })
    }
  }

  const updateAccountBalance = async (transactionData: any) => {
    try {
      // Get access token with fallback
      let accessToken = user?.accessToken
      if (!accessToken && typeof window !== 'undefined') {
        accessToken = localStorage.getItem('calvarypay_access_token') || 
                     localStorage.getItem('auth_token')
      }
      
      if (!accessToken) {
        console.error('No access token available for balance update')
        return null
      }

      const response = await fetch('/api/company/update-balance', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: transactionData.amount,
          currency: transactionData.currency,
          reference: transactionData.reference,
          transactionId: transactionData.id,
          purpose: transactionData.metadata?.purpose || 'deposit'
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('Balance update successful:', result.data)
        return result.data
      } else {
        console.error('Failed to update account balance:', await response.json())
        return null
      }
    } catch (error) {
      console.error('Error updating account balance:', error)
      return null
    }
  }

  const getStatusIcon = () => {
    switch (paymentStatus.status) {
      case 'loading':
        return <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
      case 'success':
        return <CheckCircle className="w-8 h-8 text-emerald-400" />
      case 'failed':
        return <XCircle className="w-8 h-8 text-red-400" />
      default:
        return <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
    }
  }

  const getStatusColor = () => {
    switch (paymentStatus.status) {
      case 'success':
        return 'bg-emerald-500/20 border-emerald-500/30'
      case 'failed':
        return 'bg-red-500/20 border-red-500/30'
      case 'loading':
        return 'bg-blue-500/20 border-blue-500/30'
      default:
        return 'bg-yellow-500/20 border-yellow-500/30'
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-4" />
            <p className="text-slate-300">Loading user session...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!user.accessToken) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-6 text-center">
            <XCircle className="w-8 h-8 text-red-400 mx-auto mb-4" />
            <p className="text-slate-300 mb-4">Authentication token not available</p>
            <Button asChild className="bg-red-600 hover:bg-red-700 text-white">
              <Link href="/auth/signin">
                Sign In Again
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Card className="bg-slate-800 border-slate-700 shadow-2xl max-w-md w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {getStatusIcon()}
          </div>
          <CardTitle className="text-white text-xl">
            Payment {paymentStatus.status === 'success' ? 'Successful' : 
                    paymentStatus.status === 'failed' ? 'Failed' : 
                    paymentStatus.status === 'loading' ? 'Processing' : 'Pending'}
          </CardTitle>
          <CardDescription className="text-slate-400">
            {paymentStatus.message}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Payment Details */}
          {paymentStatus.status === 'success' && paymentStatus.transactionData && (
            <div className="bg-slate-700/50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Amount:</span>
                <span className="text-white font-semibold">
                  {formatCurrency(paymentStatus.transactionData.amount, paymentStatus.transactionData.currency)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Reference:</span>
                <span className="text-slate-300 text-sm font-mono">
                  {paymentStatus.transactionData.reference}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Status:</span>
                <span className="text-emerald-400 font-medium">Completed</span>
              </div>
              {paymentStatus.transactionData.metadata?.purpose && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-300">Purpose:</span>
                  <span className="text-slate-300 capitalize">
                    {paymentStatus.transactionData.metadata.purpose.replace('_', ' ')}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Error Details */}
          {paymentStatus.status === 'failed' && paymentStatus.error && (
            <Alert className="bg-red-500/20 border-red-500/30">
              <XCircle className="h-4 w-4" />
              <AlertDescription className="text-red-400">
                {paymentStatus.error}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {paymentStatus.status === 'success' && (
              <>
                <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                  <Link href="/dashboard/company">
                    <DollarSign className="w-4 h-4 mr-2" />
                    View Company Dashboard
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-700">
                  <Link href="/dashboard/company/deposit">
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Make Another Deposit
                  </Link>
                </Button>
              </>
            )}

            {paymentStatus.status === 'failed' && (
              <>
                <Button asChild className="w-full bg-red-600 hover:bg-red-700 text-white">
                  <Link href="/dashboard/company/deposit">
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Try Again
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-700">
                  <Link href="/dashboard/company">
                    <Home className="w-4 h-4 mr-2" />
                    Back to Dashboard
                  </Link>
                </Button>
              </>
            )}

            {paymentStatus.status === 'loading' && (
              <Button disabled className="w-full bg-slate-600 text-slate-300">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </Button>
            )}
          </div>

          {/* Reference Info */}
          {reference && (
            <div className="text-center">
              <p className="text-slate-400 text-sm">
                Reference: <span className="font-mono text-slate-300">{reference}</span>
              </p>
            </div>
          )}

          {/* Success Display */}
          {paymentStatus.status === 'success' && (
            <div className="space-y-4">
              <Alert className="bg-emerald-500/20 border-emerald-500/30">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription className="text-emerald-400">
                  {paymentStatus.message}
                </AlertDescription>
              </Alert>
              
              {paymentStatus.transactionData && (
                <Card className="bg-emerald-500/10 border-emerald-500/30">
                  <CardContent className="p-4">
                    <div className="text-center">
                      <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                      <h3 className="text-lg font-semibold text-emerald-300 mb-2">
                        Payment Successful!
                      </h3>
                      <p className="text-emerald-200 text-sm mb-3">
                        Your deposit has been processed and your account balance has been updated.
                      </p>
                      <div className="bg-emerald-500/20 rounded-lg p-3 mb-4">
                        <p className="text-emerald-100 text-sm">Transaction Reference</p>
                        <p className="text-emerald-300 font-mono text-lg">
                          {paymentStatus.transactionData.reference}
                        </p>
                      </div>
                      <div className="flex space-x-3 justify-center">
                        <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white">
                          <Link href="/dashboard/company">
                            Back to Dashboard
                          </Link>
                        </Button>
                        <Button asChild variant="outline" className="border-emerald-500 text-emerald-300 hover:bg-emerald-500/20">
                          <Link href="/dashboard/company/deposit">
                            Make Another Deposit
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default PaymentCallbackPage 