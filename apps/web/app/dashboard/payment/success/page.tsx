"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Download, ArrowLeft, Home, Receipt } from "lucide-react"
import Link from "next/link"
import { EmployeeLayout } from "@/components/dashboard/role-based-layout"
import { withRouteProtection } from "@/lib/auth/route-protection"

function PaymentSuccessPage() {
  const searchParams = useSearchParams()
  const [paymentDetails, setPaymentDetails] = useState<{
    reference: string
    status: string
    amount?: string
    currency?: string
  }>({
    reference: "",
    status: ""
  })

  useEffect(() => {
    const reference = searchParams.get('reference')
    const status = searchParams.get('status')
    
    if (reference && status) {
      setPaymentDetails({
        reference,
        status,
        amount: searchParams.get('amount') || undefined,
        currency: searchParams.get('currency') || undefined
      })
    }
  }, [searchParams])

  return (
    <EmployeeLayout>
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-900/50 border-slate-800 shadow-2xl backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <div className="mx-auto w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-white mb-2">
              Payment Successful!
            </CardTitle>
            <CardDescription className="text-slate-400">
              Your transaction has been completed successfully
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Payment Details */}
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Reference:</span>
                  <span className="text-white text-sm font-mono">
                    {paymentDetails.reference}
                  </span>
                </div>
                
                {paymentDetails.amount && paymentDetails.currency && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm">Amount:</span>
                    <span className="text-white text-sm font-semibold">
                      {paymentDetails.currency} {paymentDetails.amount}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Status:</span>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    {paymentDetails.status}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Success Message */}
            <div className="text-center space-y-2">
              <p className="text-emerald-400 text-sm font-medium">
                Your payment has been processed successfully!
              </p>
              <p className="text-slate-400 text-xs">
                You will receive a confirmation email shortly. The funds have been added to your account.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                <Link href="/dashboard/employee">
                  <Home className="w-4 h-4 mr-2" />
                  Go to Dashboard
                </Link>
              </Button>
              
              <Button asChild variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-700">
                <Link href="/dashboard/employee/transactions">
                  <Receipt className="w-4 h-4 mr-2" />
                  View Transactions
                </Link>
              </Button>
            </div>

            {/* Additional Info */}
            <div className="text-center">
              <p className="text-slate-500 text-xs">
                Need help? Contact support at{" "}
                <a href="mailto:support@calvarypay.com" className="text-blue-400 hover:underline">
                  support@calvarypay.com
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </EmployeeLayout>
  )
}

export default withRouteProtection(PaymentSuccessPage, ['employee', 'merchant']) 