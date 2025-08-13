"use client"

import { useState } from "react"
import { useAuth } from "@/lib/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, Upload, DollarSign, Building2, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import { MerchantLayout } from "@/components/dashboard/role-based-layout"
import { withRouteProtection } from "@/lib/auth/route-protection"
import { formatCurrency } from "@/lib/utils"

// Types
interface DepositForm {
  amount: string
  currency: string
  purpose: string
  description: string
}

interface DepositResponse {
  success: boolean
  data: {
    authorizationUrl: string
    reference: string
    accessCode: string
    amount: number
    currency: string
    purpose: string
    companyName: string
  }
  error?: {
    message: string
  }
}

function CompanyDepositPage() {
  const { user } = useAuth()
  const [formData, setFormData] = useState<DepositForm>({
    amount: "",
    currency: "GHS",
    purpose: "company_deposit",
    description: ""
  })
  const [isLoading, setIsLoading] = useState(false)
  const [response, setResponse] = useState<DepositResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleInputChange = (field: keyof DepositForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
    setResponse(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setResponse(null)

    try {
      const response = await fetch('/api/company/deposit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (response.ok) {
        setResponse(result)
        // Redirect to Paystack payment page
        if (result.data?.authorizationUrl) {
          window.location.href = result.data.authorizationUrl
        }
      } else {
        setError(result.error?.message || 'Failed to initialize deposit')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const isFormValid = formData.amount && parseFloat(formData.amount) > 0

  return (
    <MerchantLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/company">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Company Deposit</h1>
            <p className="text-slate-400">Add funds to your company account</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Deposit Form */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <Building2 className="w-5 h-5 mr-2 text-emerald-400" />
                  Company Deposit
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Deposit funds to your company account using Paystack
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Amount */}
                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-slate-300">
                      Amount
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="amount"
                        type="number"
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={(e) => handleInputChange('amount', e.target.value)}
                        className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                        min="0.01"
                        step="0.01"
                        required
                      />
                    </div>
                  </div>

                  {/* Currency */}
                  <div className="space-y-2">
                    <Label htmlFor="currency" className="text-slate-300">
                      Currency
                    </Label>
                    <Select
                      value={formData.currency}
                      onValueChange={(value) => handleInputChange('currency', value)}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="GHS" className="text-white hover:bg-slate-700">
                          GHS - Ghanaian Cedi
                        </SelectItem>
                        <SelectItem value="NGN" className="text-white hover:bg-slate-700">
                          NGN - Nigerian Naira
                        </SelectItem>
                        <SelectItem value="USD" className="text-white hover:bg-slate-700">
                          USD - US Dollar
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Purpose */}
                  <div className="space-y-2">
                    <Label htmlFor="purpose" className="text-slate-300">
                      Purpose
                    </Label>
                    <Select
                      value={formData.purpose}
                      onValueChange={(value) => handleInputChange('purpose', value)}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="company_deposit" className="text-white hover:bg-slate-700">
                          Company Operating Funds
                        </SelectItem>
                        <SelectItem value="company_budget" className="text-white hover:bg-slate-700">
                          Company Budget
                        </SelectItem>
                        <SelectItem value="employee_payroll" className="text-white hover:bg-slate-700">
                          Employee Payroll
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-slate-300">
                      Description (Optional)
                    </Label>
                    <Input
                      id="description"
                      placeholder="e.g., Monthly operating funds, Q4 budget allocation"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                    />
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={!isFormValid || isLoading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Initialize Deposit
                      </>
                    )}
                  </Button>
                </form>

                {/* Error Display */}
                {error && (
                  <Alert className="mt-4 bg-red-500/20 border-red-500/30">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-red-400">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Success Display */}
                {response?.success && (
                  <Alert className="mt-4 bg-emerald-500/20 border-emerald-500/30">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription className="text-emerald-400">
                      Deposit initialized successfully! Redirecting to payment page...
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Info Panel */}
          <div className="space-y-6">
            {/* Company Info */}
            <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Company Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Building2 className="w-5 h-5 text-emerald-400" />
                  <div>
                    <p className="text-white font-medium">Company Account</p>
                    <p className="text-slate-400 text-sm">Merchant Account</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-700">
                  <p className="text-slate-400 text-sm">
                    Deposits will be added to your company account and can be used for:
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-slate-300">
                    <li>• Employee budget allocation</li>
                    <li>• Company operations</li>
                    <li>• Payroll management</li>
                    <li>• Business expenses</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Security Info */}
            <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Security & Compliance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5" />
                  <p className="text-slate-300 text-sm">
                    All transactions are secured with bank-level encryption
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5" />
                  <p className="text-slate-300 text-sm">
                    Paystack handles payment processing securely
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5" />
                  <p className="text-slate-300 text-sm">
                    Full transaction audit trail maintained
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MerchantLayout>
  )
}

export default withRouteProtection(CompanyDepositPage, ['merchant', 'admin']) 