"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  CreditCard,
  Send,
  Download,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  DollarSign,
  User,
  FileText,
  Tag
} from "lucide-react"
import { EmployeeLayout } from "@/components/dashboard/role-based-layout"
import { withRouteProtection } from "@/lib/auth/route-protection"
import { useAuth } from "@/lib/hooks/use-auth"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"

// Payment categories
const PAYMENT_CATEGORIES = [
  { value: "fuel", label: "Fuel" },
  { value: "maintenance", label: "Vehicle Maintenance" },
  { value: "toll", label: "Toll Fees" },
  { value: "parking", label: "Parking" },
  { value: "food", label: "Meals & Food" },
  { value: "accommodation", label: "Accommodation" },
  { value: "supplies", label: "Office Supplies" },
  { value: "transport", label: "Transportation" },
  { value: "utilities", label: "Utilities" },
  { value: "other", label: "Other" }
]

// Currency options
const CURRENCIES = [
  { value: "NGN", label: "NGN (₦)", symbol: "₦" },
  { value: "USD", label: "USD ($)", symbol: "$" },
  { value: "GHS", label: "GHS (₵)", symbol: "₵" },
  { value: "KES", label: "KES (KSh)", symbol: "KSh" },
  { value: "ZAR", label: "ZAR (R)", symbol: "R" }
]

// Payment methods
const PAYMENT_METHODS = [
  { value: "card", label: "Card Payment" },
  { value: "bank", label: "Bank Transfer" },
  { value: "ussd", label: "USSD" },
  { value: "qr", label: "QR Code" },
  { value: "mobile_money", label: "Mobile Money" }
]

function QuickPayPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  // Form state
  const [formData, setFormData] = useState({
    amount: "",
    currency: "NGN",
    payee: "",
    category: "",
    memo: "",
    paymentMethod: "card"
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Payment mutation
  const paymentMutation = useMutation({
    mutationFn: async (paymentData: any) => {
      const response = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to initialize payment')
      }

      return response.json()
    },
    onSuccess: (data) => {
      // Redirect to payment page
      if (data.authorizationUrl) {
        window.open(data.authorizationUrl, '_blank')
      }
      
      // Reset form
      setFormData({
        amount: "",
        currency: "NGN",
        payee: "",
        category: "",
        memo: "",
        paymentMethod: "card"
      })
      setErrors({})
      
      // Invalidate transactions to show new payment
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['recent-transactions'] })
    },
    onError: (error: unknown) => {
      console.error('Payment initialization failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize payment'
      console.error('Error message:', errorMessage)
    }
  })

  // Form validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = "Please enter a valid amount"
    }

    if (parseFloat(formData.amount) > 1000000) {
      newErrors.amount = "Amount cannot exceed 1,000,000"
    }

    if (!formData.payee.trim()) {
      newErrors.payee = "Please enter payee information"
    }

    if (!formData.category) {
      newErrors.category = "Please select a category"
    }

    if (!formData.memo.trim()) {
      newErrors.memo = "Please enter a memo/description"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    const paymentData = {
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      channel: formData.paymentMethod,
      description: `${formData.category}: ${formData.memo}`,
      metadata: {
        payee: formData.payee,
        category: formData.category,
        memo: formData.memo,
        source: 'quick_pay',
        userId: user?.userId
      }
    }

    paymentMutation.mutate(paymentData)
  }

  // Handle input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }))
    }
  }

  // Get currency symbol
  const getCurrencySymbol = (currency: string) => {
    return CURRENCIES.find(c => c.value === currency)?.symbol || "₦"
  }

  return (
    <EmployeeLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/employee">
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Quick Pay</h1>
              <p className="text-slate-400">Send payments quickly and securely</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Link href="/dashboard/employee/transactions">
              <Button
                variant="outline"
                size="sm"
                className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
              >
                <FileText className="w-4 h-4 mr-2" />
                View Transactions
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Pay Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Payment Form */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white text-xl font-semibold flex items-center">
                  <CreditCard className="w-5 h-5 mr-2 text-blue-400" />
                  Payment Details
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Enter the payment information below
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Amount and Currency */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="amount" className="text-slate-300 flex items-center">
                        <DollarSign className="w-4 h-4 mr-1" />
                        Amount *
                      </Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={(e) => handleInputChange('amount', e.target.value)}
                        className={`bg-slate-800 border-slate-700 text-white text-lg font-semibold ${
                          errors.amount ? 'border-red-500' : 'focus:border-blue-500'
                        }`}
                        required
                      />
                      {errors.amount && (
                        <p className="text-red-400 text-sm flex items-center">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          {errors.amount}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency" className="text-slate-300">Currency</Label>
                      <Select value={formData.currency} onValueChange={(value) => handleInputChange('currency', value)}>
                        <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          {CURRENCIES.map((currency) => (
                            <SelectItem key={currency.value} value={currency.value}>
                              {currency.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Payee */}
                  <div className="space-y-2">
                    <Label htmlFor="payee" className="text-slate-300 flex items-center">
                      <User className="w-4 h-4 mr-1" />
                      Payee *
                    </Label>
                    <Input
                      id="payee"
                      placeholder="Enter payee name, email, or account details"
                      value={formData.payee}
                      onChange={(e) => handleInputChange('payee', e.target.value)}
                      className={`bg-slate-800 border-slate-700 text-white ${
                        errors.payee ? 'border-red-500' : 'focus:border-blue-500'
                      }`}
                      required
                    />
                    {errors.payee && (
                      <p className="text-red-400 text-sm flex items-center">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        {errors.payee}
                      </p>
                    )}
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-slate-300 flex items-center">
                      <Tag className="w-4 h-4 mr-1" />
                      Category *
                    </Label>
                    <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                      <SelectTrigger className={`bg-slate-800 border-slate-700 text-white ${
                        errors.category ? 'border-red-500' : 'focus:border-blue-500'
                      }`}>
                        <SelectValue placeholder="Select payment category" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {PAYMENT_CATEGORIES.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.category && (
                      <p className="text-red-400 text-sm flex items-center">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        {errors.category}
                      </p>
                    )}
                  </div>

                  {/* Memo */}
                  <div className="space-y-2">
                    <Label htmlFor="memo" className="text-slate-300 flex items-center">
                      <FileText className="w-4 h-4 mr-1" />
                      Memo/Description *
                    </Label>
                    <Textarea
                      id="memo"
                      placeholder="Enter payment description or memo"
                      value={formData.memo}
                      onChange={(e) => handleInputChange('memo', e.target.value)}
                      className={`bg-slate-800 border-slate-700 text-white min-h-[100px] ${
                        errors.memo ? 'border-red-500' : 'focus:border-blue-500'
                      }`}
                      required
                    />
                    {errors.memo && (
                      <p className="text-red-400 text-sm flex items-center">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        {errors.memo}
                      </p>
                    )}
                  </div>

                  {/* Payment Method */}
                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod" className="text-slate-300">Payment Method</Label>
                    <Select value={formData.paymentMethod} onValueChange={(value) => handleInputChange('paymentMethod', value)}>
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {PAYMENT_METHODS.map((method) => (
                          <SelectItem key={method.value} value={method.value}>
                            {method.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Error Alert */}
                  {paymentMutation.error && (
                    <Alert className="bg-red-500/20 border-red-500/30">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-red-400">
                        {paymentMutation.error.message}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 text-lg"
                    disabled={paymentMutation.isPending}
                  >
                    {paymentMutation.isPending ? (
                      <>
                        <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                        Processing Payment...
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5 mr-2" />
                        Pay Now
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Payment Summary */}
          <div className="space-y-6">
            <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white text-lg font-semibold">Payment Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Amount:</span>
                    <span className="text-white font-semibold">
                      {formData.amount ? formatCurrency(parseFloat(formData.amount), formData.currency) : `${getCurrencySymbol(formData.currency)}0.00`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Payee:</span>
                    <span className="text-white text-sm truncate max-w-32">
                      {formData.payee || "Not specified"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Category:</span>
                    <span className="text-white text-sm">
                      {PAYMENT_CATEGORIES.find(c => c.value === formData.category)?.label || "Not selected"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Method:</span>
                    <span className="text-white text-sm">
                      {PAYMENT_METHODS.find(m => m.value === formData.paymentMethod)?.label || "Card"}
                    </span>
                  </div>
                </div>
                
                <div className="border-t border-slate-700 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Total:</span>
                    <span className="text-white font-bold text-lg">
                      {formData.amount ? formatCurrency(parseFloat(formData.amount), formData.currency) : `${getCurrencySymbol(formData.currency)}0.00`}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Notice */}
            <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-white font-medium text-sm">Secure Payment</p>
                    <p className="text-slate-400 text-xs">
                      Your payment is protected by bank-level security and encryption.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </EmployeeLayout>
  )
}

export default withRouteProtection(QuickPayPage, ['employee'])
