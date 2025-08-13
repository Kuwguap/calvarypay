"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  CreditCard,
  Send,
  Download,
  Upload,
  Users,
  Building2,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react"
import { EmployeeLayout } from "@/components/dashboard/role-based-layout"
import { withRouteProtection } from "@/lib/auth/route-protection"
import { useAuth } from "@/lib/hooks/use-auth"
import { formatCurrency } from "@/lib/utils"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Currency options
const CURRENCIES = [
  { value: "GHS", label: "GHS (₵)", symbol: "₵" },
  { value: "NGN", label: "NGN (₦)", symbol: "₦" },
  { value: "USD", label: "USD ($)", symbol: "$" },
  { value: "EUR", label: "EUR (€)", symbol: "€" },
  { value: "GBP", label: "GBP (£)", symbol: "£" },
  { value: "ZAR", label: "ZAR (R)", symbol: "R" }
]

function QuickPayPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  // State for deposit form
  const [depositForm, setDepositForm] = useState({
    amount: "",
    currency: "GHS",
    purpose: "deposit"
  })

  // State for transfer form
  const [transferForm, setTransferForm] = useState({
    amount: "",
    currency: "GHS",
    recipientId: "",
    recipientEmail: "",
    reason: ""
  })

  // State for company employees
  const [employees, setEmployees] = useState<any[]>([])
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false)

  // State for payment status
  const [paymentStatus, setPaymentStatus] = useState<{
    type: 'deposit' | 'transfer' | null
    status: 'idle' | 'loading' | 'success' | 'error'
    message: string
    data?: any
  }>({
    type: null,
    status: 'idle',
    message: ''
  })

  // Fetch company employees for transfer
  useEffect(() => {
    const fetchEmployees = async () => {
      if (!user?.accessToken) return
      
      setIsLoadingEmployees(true)
      try {
        const response = await fetch('/api/merchant/employees?limit=100', {
          headers: {
            'Authorization': `Bearer ${user.accessToken}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          setEmployees(data.employees || [])
        }
      } catch (error) {
        console.error('Failed to fetch employees:', error)
      } finally {
        setIsLoadingEmployees(false)
      }
    }

    fetchEmployees()
  }, [user?.accessToken])

  // Deposit mutation
  const depositMutation = useMutation({
    mutationFn: async (depositData: any) => {
      const response = await fetch('/api/payments/deposit', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(depositData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to initialize deposit')
      }

      return response.json()
    },
    onSuccess: (data) => {
      setPaymentStatus({
        type: 'deposit',
        status: 'success',
        message: 'Deposit initialized successfully!',
        data: data.data
      })

      // Redirect to Paystack payment page
      if (data.data?.authorizationUrl) {
        window.open(data.data.authorizationUrl, '_blank')
      }

      // Reset form
      setDepositForm({
        amount: "",
        currency: "NGN",
        purpose: "deposit"
      })

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['recent-transactions'] })
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize deposit'
      setPaymentStatus({
        type: 'deposit',
        status: 'error',
        message: errorMessage
      })
    }
  })

  // Transfer mutation
  const transferMutation = useMutation({
    mutationFn: async (transferData: any) => {
      const response = await fetch('/api/payments/transfer', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(transferData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to initiate transfer')
      }

      return response.json()
    },
    onSuccess: (data) => {
      setPaymentStatus({
        type: 'transfer',
        status: 'success',
        message: 'Transfer initiated successfully!',
        data: data.data
      })

      // Reset form
      setTransferForm({
        amount: "",
        currency: "NGN",
        recipientId: "",
        recipientEmail: "",
        reason: ""
      })

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['recent-transactions'] })
    },
    onError: (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initiate transfer'
      setPaymentStatus({
        type: 'transfer',
        status: 'error',
        message: errorMessage
      })
    }
  })

  // Handle deposit submission
  const handleDepositSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!depositForm.amount || parseFloat(depositForm.amount) <= 0) {
      setPaymentStatus({
        type: 'deposit',
        status: 'error',
        message: 'Please enter a valid amount'
      })
      return
    }

    setPaymentStatus({
      type: 'deposit',
      status: 'loading',
      message: 'Initializing deposit...'
    })

    depositMutation.mutate({
      amount: parseFloat(depositForm.amount),
      currency: depositForm.currency,
      purpose: depositForm.purpose
    })
  }

  // Handle transfer submission
  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!transferForm.amount || parseFloat(transferForm.amount) <= 0) {
      setPaymentStatus({
        type: 'transfer',
        status: 'error',
        message: 'Please enter a valid amount'
      })
      return
    }

    if (!transferForm.recipientId || !transferForm.recipientEmail) {
      setPaymentStatus({
        type: 'transfer',
        status: 'error',
        message: 'Please select a recipient'
      })
      return
    }

    if (!transferForm.reason) {
      setPaymentStatus({
        type: 'transfer',
        status: 'error',
        message: 'Please provide a reason for the transfer'
      })
      return
    }

    setPaymentStatus({
      type: 'transfer',
      status: 'loading',
      message: 'Initiating transfer...'
    })

    transferMutation.mutate({
      amount: parseFloat(transferForm.amount),
      currency: transferForm.currency,
      recipientId: transferForm.recipientId,
      recipientEmail: transferForm.recipientEmail,
      reason: transferForm.reason
    })
  }

  // Handle employee selection
  const handleEmployeeSelect = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId)
    if (employee) {
      setTransferForm(prev => ({
        ...prev,
        recipientId: employee.id,
        recipientEmail: employee.email
      }))
    }
  }

  // Clear payment status
  const clearPaymentStatus = () => {
    setPaymentStatus({
      type: null,
      status: 'idle',
      message: ''
    })
  }

  return (
    <EmployeeLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Quick Pay</h1>
            <p className="text-slate-400">Deposit funds and send money to colleagues</p>
          </div>
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            Powered by Paystack
          </Badge>
        </div>

        {/* Payment Status Alert */}
        {paymentStatus.status !== 'idle' && (
          <Alert className={
            paymentStatus.status === 'success' 
              ? 'bg-emerald-500/20 border-emerald-500/30' 
              : paymentStatus.status === 'error'
              ? 'bg-red-500/20 border-red-500/30'
              : 'bg-blue-500/20 border-blue-500/30'
          }>
            {paymentStatus.status === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
            {paymentStatus.status === 'success' && <CheckCircle className="h-4 w-4" />}
            {paymentStatus.status === 'error' && <AlertCircle className="h-4 w-4" />}
            <AlertDescription className="text-white">
              {paymentStatus.message}
            </AlertDescription>
            {paymentStatus.status !== 'loading' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearPaymentStatus}
                className="ml-auto text-white hover:bg-white/10"
              >
                Dismiss
              </Button>
            )}
          </Alert>
        )}

        {/* Main Content */}
        <Tabs defaultValue="deposit" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-800 border-slate-700">
            <TabsTrigger value="deposit" className="data-[state=active]:bg-blue-600">
              <Upload className="w-4 h-4 mr-2" />
              Deposit Funds
            </TabsTrigger>
            <TabsTrigger value="transfer" className="data-[state=active]:bg-green-600">
              <Send className="w-4 h-4 mr-2" />
              Send Money
            </TabsTrigger>
          </TabsList>

          {/* Deposit Tab */}
          <TabsContent value="deposit" className="space-y-6">
            <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white text-lg font-semibold flex items-center">
                  <CreditCard className="w-5 h-5 mr-2 text-blue-400" />
                  Deposit Funds to Company Account
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Add funds to your company account using Paystack. All deposits are processed securely.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleDepositSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="deposit-amount" className="text-white">Amount</Label>
                      <div className="relative">
                        <Input
                          id="deposit-amount"
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="0.00"
                          value={depositForm.amount}
                          onChange={(e) => setDepositForm(prev => ({ ...prev, amount: e.target.value }))}
                          className="bg-slate-800 border-slate-700 text-white pl-8"
                          required
                        />
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
                          {CURRENCIES.find(c => c.value === depositForm.currency)?.symbol}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="deposit-currency" className="text-white">Currency</Label>
                      <Select
                        value={depositForm.currency}
                        onValueChange={(value) => setDepositForm(prev => ({ ...prev, currency: value }))}
                      >
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

                  <div className="space-y-2">
                    <Label htmlFor="deposit-purpose" className="text-white">Purpose</Label>
                    <Select
                      value={depositForm.purpose}
                      onValueChange={(value) => setDepositForm(prev => ({ ...prev, purpose: value as 'deposit' | 'transfer' }))}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="deposit">General Deposit</SelectItem>
                        <SelectItem value="transfer">Fund Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                    <div className="flex items-center space-x-2 text-sm text-slate-300 mb-2">
                      <Building2 className="w-4 h-4" />
                      <span>Company Information</span>
                    </div>
                    <div className="text-xs text-slate-400 space-y-1">
                      <p>• Deposits are added to your company's account balance</p>
                      <p>• You can use these funds for company expenses and transfers</p>
                      <p>• All transactions are recorded and auditable</p>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={depositMutation.isPending}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
                  >
                    {depositMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        Proceed to Payment
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transfer Tab */}
          <TabsContent value="transfer" className="space-y-6">
            <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white text-lg font-semibold flex items-center">
                  <Send className="w-5 h-5 mr-2 text-green-400" />
                  Send Money to Colleague
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Transfer funds to other employees within your company. Transfers are instant and secure.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleTransferSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="transfer-amount" className="text-white">Amount</Label>
                      <div className="relative">
                        <Input
                          id="transfer-amount"
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="0.00"
                          value={transferForm.amount}
                          onChange={(e) => setTransferForm(prev => ({ ...prev, amount: e.target.value }))}
                          className="bg-slate-800 border-slate-700 text-white pl-8"
                          required
                        />
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
                          {CURRENCIES.find(c => c.value === transferForm.currency)?.symbol}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="transfer-currency" className="text-white">Currency</Label>
                      <Select
                        value={transferForm.currency}
                        onValueChange={(value) => setTransferForm(prev => ({ ...prev, currency: value }))}
                      >
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

                  <div className="space-y-2">
                    <Label htmlFor="transfer-recipient" className="text-white">Recipient</Label>
                    <Select
                      value={transferForm.recipientId}
                      onValueChange={handleEmployeeSelect}
                      disabled={isLoadingEmployees}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue placeholder={isLoadingEmployees ? "Loading employees..." : "Select recipient"} />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {employees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            <div className="flex items-center space-x-2">
                              <span>{employee.first_name} {employee.last_name}</span>
                              <Badge variant="outline" className="text-xs">
                                {employee.department || 'No Department'}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="transfer-reason" className="text-white">Reason for Transfer</Label>
                    <Textarea
                      id="transfer-reason"
                      placeholder="e.g., Lunch payment, Project expenses, etc."
                      value={transferForm.reason}
                      onChange={(e) => setTransferForm(prev => ({ ...prev, reason: e.target.value }))}
                      className="bg-slate-800 border-slate-700 text-white resize-none"
                      rows={3}
                      required
                    />
                  </div>

                  {transferForm.recipientId && (
                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                      <div className="flex items-center space-x-2 text-sm text-slate-300 mb-2">
                        <Users className="w-4 h-4" />
                        <span>Recipient Details</span>
                      </div>
                      <div className="text-xs text-slate-400 space-y-1">
                        <p>• Recipient: {employees.find(emp => emp.id === transferForm.recipientId)?.first_name} {employees.find(emp => emp.id === transferForm.recipientId)?.last_name}</p>
                        <p>• Email: {transferForm.recipientEmail}</p>
                        <p>• Department: {employees.find(emp => emp.id === transferForm.recipientId)?.department || 'Not assigned'}</p>
                      </div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={transferMutation.isPending || !transferForm.recipientId}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3"
                  >
                    {transferMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing Transfer...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Send Money
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Information Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white text-lg font-semibold flex items-center">
                <Download className="w-5 h-5 mr-2 text-blue-400" />
                How Deposits Work
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-slate-300 space-y-2">
                <p>1. Enter amount and select currency</p>
                <p>2. Click "Proceed to Payment"</p>
                <p>3. Complete payment on Paystack</p>
                <p>4. Funds are added to company account</p>
                <p>5. Transaction is recorded automatically</p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white text-lg font-semibold flex items-center">
                <Send className="w-5 h-5 mr-2 text-green-400" />
                How Transfers Work
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-slate-300 space-y-2">
                <p>1. Select recipient from company</p>
                <p>2. Enter amount and reason</p>
                <p>3. Confirm transfer details</p>
                <p>4. Money is sent instantly</p>
                <p>5. Both parties are notified</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </EmployeeLayout>
  )
}

export default withRouteProtection(QuickPayPage, ['employee'])
