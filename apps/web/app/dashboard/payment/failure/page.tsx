"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, RefreshCw, ArrowLeft, Home, HelpCircle } from "lucide-react"
import Link from "next/link"
import { EmployeeLayout } from "@/components/dashboard/role-based-layout"
import { withRouteProtection } from "@/lib/auth/route-protection"

function PaymentFailurePage() {
  const searchParams = useSearchParams()
  const [failureDetails, setFailureDetails] = useState<{
    reference?: string
    error?: string
    status?: string
  }>({})

  useEffect(() => {
    const reference = searchParams.get('reference')
    const error = searchParams.get('error')
    const status = searchParams.get('status')
    
    if (reference || error || status) {
      setFailureDetails({
        reference: reference || undefined,
        error: error || undefined,
        status: status || undefined
      })
    }
  }, [searchParams])

  const getErrorMessage = () => {
    if (failureDetails.error === 'verification_failed') {
      return 'Payment verification failed. Please contact support if you believe this is an error.'
    }
    if (failureDetails.status === 'failed') {
      return 'Your payment was not successful. Please try again or use a different payment method.'
    }
    if (failureDetails.status === 'abandoned') {
      return 'Payment was abandoned. You can try again at any time.'
    }
    return 'An unexpected error occurred during payment processing. Please try again.'
  }

  const getErrorType = () => {
    if (failureDetails.error === 'verification_failed') {
      return 'Verification Error'
    }
    if (failureDetails.status === 'failed') {
      return 'Payment Failed'
    }
    if (failureDetails.status === 'abandoned') {
      return 'Payment Abandoned'
    }
    return 'Processing Error'
  }

  return (
    <EmployeeLayout>
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-900/50 border-slate-800 shadow-2xl backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-white mb-2">
              Payment Failed
            </CardTitle>
            <CardDescription className="text-slate-400">
              {getErrorMessage()}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Error Details */}
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
              <div className="space-y-3">
                {failureDetails.reference && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm">Reference:</span>
                    <span className="text-white text-sm font-mono">
                      {failureDetails.reference}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Error Type:</span>
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                    {getErrorType()}
                  </Badge>
                </div>
                
                {failureDetails.status && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm">Status:</span>
                    <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">
                      {failureDetails.status}
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Help Information */}
            <div className="bg-blue-500/10 p-4 rounded-lg border border-blue-500/20">
              <div className="flex items-start space-x-3">
                <HelpCircle className="w-5 h-5 text-blue-400 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-blue-400 text-sm font-medium">What to do next:</p>
                  <ul className="text-blue-300 text-xs space-y-1">
                    <li>• Check your payment method details</li>
                    <li>• Ensure you have sufficient funds</li>
                    <li>• Try using a different payment method</li>
                    <li>• Contact support if the issue persists</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                <Link href="/dashboard/employee/quick-pay">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Link>
              </Button>
              
              <Button asChild variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-700">
                <Link href="/dashboard/employee">
                  <Home className="w-4 h-4 mr-2" />
                  Go to Dashboard
                </Link>
              </Button>
            </div>

            {/* Support Information */}
            <div className="text-center space-y-2">
              <p className="text-slate-400 text-xs">
                Need immediate assistance?
              </p>
              <div className="flex flex-col space-y-1 text-xs">
                <a href="mailto:support@calvarypay.com" className="text-blue-400 hover:underline">
                  support@calvarypay.com
                </a>
                <span className="text-slate-500">or call +234-XXX-XXX-XXXX</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </EmployeeLayout>
  )
}

export default withRouteProtection(PaymentFailurePage, ['employee', 'merchant']) 