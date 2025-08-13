"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
  DollarSign,
  TrendingUp,
  Clock,
  Plus,
  Search,
  Filter,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  ArrowLeft,
} from "lucide-react"
import { EmployeeLayout } from "@/components/dashboard/role-based-layout"
import { withRouteProtection } from "@/lib/auth/route-protection"
import { enhancedPaymentService } from "@/lib/services/enhanced-payment.service"
import { useAuth } from "@/lib/hooks/use-auth"
import { formatCurrency, formatDate } from "@/lib/utils"
import Link from "next/link"

// Types
interface Transaction {
  id: string
  userId: string
  amount: number
  amountMinor: number
  currency: string
  status: 'pending' | 'success' | 'failed' | 'abandoned' | 'cancelled'
  reference: string
  description?: string
  channel?: string
  paidAt?: string
  createdAt: string
  updatedAt: string
}

interface TransactionStats {
  totalAmount: number
  totalTransactions: number
  pendingTransactions: number
  pendingAmount: number
  successfulTransactions: number
  averageTransaction: number
}

function TransactionsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  // State
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [filterCurrency, setFilterCurrency] = useState("all")
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  
  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    currency: "NGN",
    description: "",
    channel: "card"
  })

  // Fetch transactions
  const {
    data: transactionsData,
    isLoading: transactionsLoading,
    error: transactionsError,
    refetch: refetchTransactions
  } = useQuery({
    queryKey: ['transactions', page, limit, filterStatus, filterCurrency, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(filterStatus !== 'all' && { status: filterStatus }),
        ...(filterCurrency !== 'all' && { currency: filterCurrency }),
        ...(searchTerm && { search: searchTerm })
      })

      const response = await fetch(`/api/payments/transactions?${params}`, {
        headers: {
          'Authorization': `Bearer ${user?.accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch transactions')
      }

      return response.json()
    },
    enabled: !!user?.accessToken,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000 // 1 minute
  })

  // Calculate stats from transactions
  const stats: TransactionStats = transactionsData?.transactions?.reduce((acc: TransactionStats, transaction: Transaction) => {
    acc.totalTransactions++
    acc.totalAmount += transaction.amount
    
    if (transaction.status === 'pending') {
      acc.pendingTransactions++
      acc.pendingAmount += transaction.amount
    } else if (transaction.status === 'success') {
      acc.successfulTransactions++
    }
    
    return acc
  }, {
    totalAmount: 0,
    totalTransactions: 0,
    pendingTransactions: 0,
    pendingAmount: 0,
    successfulTransactions: 0,
    averageTransaction: 0
  }) || {
    totalAmount: 0,
    totalTransactions: 0,
    pendingTransactions: 0,
    pendingAmount: 0,
    successfulTransactions: 0,
    averageTransaction: 0
  }

  // Calculate average
  stats.averageTransaction = stats.totalTransactions > 0 ? stats.totalAmount / stats.totalTransactions : 0

  // Initialize payment mutation
  const initializePaymentMutation = useMutation({
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
      setIsPaymentDialogOpen(false)
      setPaymentForm({ amount: "", currency: "NGN", description: "", channel: "card" })
      // Refetch transactions after a delay to show the new pending transaction
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['transactions'] })
      }, 2000)
    },
    onError: (error: unknown) => {
      console.error('Payment initialization failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize payment'
      console.error('Error message:', errorMessage)
    }
  })

  // Handle payment form submission
  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!paymentForm.amount || !paymentForm.description) {
      return
    }

    initializePaymentMutation.mutate({
      amount: parseFloat(paymentForm.amount),
      currency: paymentForm.currency,
      description: paymentForm.description,
      channel: paymentForm.channel,
      metadata: {
        source: 'employee_dashboard',
        userId: user?.userId
      }
    })
  }

  // Filter transactions
  const filteredTransactions = transactionsData?.transactions?.filter((transaction: Transaction) => {
    const matchesSearch = !searchTerm || 
      transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.reference.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === "all" || transaction.status === filterStatus
    const matchesCurrency = filterCurrency === "all" || transaction.currency === filterCurrency
    return matchesSearch && matchesStatus && matchesCurrency
  }) || []

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return { variant: 'default' as const, className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', icon: CheckCircle }
      case 'pending':
        return { variant: 'default' as const, className: 'bg-amber-500/20 text-amber-400 border-amber-500/30', icon: Clock }
      case 'failed':
        return { variant: 'default' as const, className: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle }
      case 'cancelled':
        return { variant: 'default' as const, className: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: XCircle }
      default:
        return { variant: 'default' as const, className: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Clock }
    }
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
              <h1 className="text-3xl font-bold text-white mb-2">Transactions</h1>
              <p className="text-slate-400">Manage your payment transactions and history</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchTransactions()}
              disabled={transactionsLoading}
              className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${transactionsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 shadow-lg px-6 py-3 font-medium">
                  <Plus className="w-4 h-4 mr-2" />
                  New Payment
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700 text-white">
                <DialogHeader>
                  <DialogTitle>Initialize New Payment</DialogTitle>
                  <DialogDescription className="text-slate-300">
                    Create a new payment transaction with Paystack
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handlePaymentSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                        className="bg-slate-700 border-slate-600"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Select value={paymentForm.currency} onValueChange={(value) => setPaymentForm(prev => ({ ...prev, currency: value }))}>
                        <SelectTrigger className="bg-slate-700 border-slate-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="NGN">NGN (₦)</SelectItem>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="GHS">GHS (₵)</SelectItem>
                          <SelectItem value="KES">KES (KSh)</SelectItem>
                          <SelectItem value="ZAR">ZAR (R)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      placeholder="Payment description"
                      value={paymentForm.description}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, description: e.target.value }))}
                      className="bg-slate-700 border-slate-600"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="channel">Payment Method</Label>
                    <Select value={paymentForm.channel} onValueChange={(value) => setPaymentForm(prev => ({ ...prev, channel: value }))}>
                      <SelectTrigger className="bg-slate-700 border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="bank">Bank Transfer</SelectItem>
                        <SelectItem value="ussd">USSD</SelectItem>
                        <SelectItem value="qr">QR Code</SelectItem>
                        <SelectItem value="mobile_money">Mobile Money</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      type="submit" 
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      disabled={initializePaymentMutation.isPending}
                    >
                      {initializePaymentMutation.isPending ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Initialize Payment'
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                      onClick={() => setIsPaymentDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                  {initializePaymentMutation.error && (
                    <Alert className="bg-red-500/20 border-red-500/30">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-red-400">
                        {initializePaymentMutation.error.message}
                      </AlertDescription>
                    </Alert>
                  )}
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Error Alert */}
        {transactionsError && (
          <Alert className="bg-red-500/20 border-red-500/30">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-400">
              Failed to load transactions. Please try again.
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-slate-400">Total Amount</CardTitle>
              <div className="p-2 bg-blue-600/20 rounded-lg">
                <DollarSign className="h-4 w-4 text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                <Skeleton className="h-8 w-24 bg-slate-700" />
              ) : (
                <div className="text-2xl font-bold text-white mb-1">
                  {formatCurrency(stats.totalAmount, 'NGN')}
                </div>
              )}
              <p className="text-xs text-slate-400">
                Across {stats.totalTransactions} transactions
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-slate-400">Successful</CardTitle>
              <div className="p-2 bg-emerald-600/20 rounded-lg">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                <Skeleton className="h-8 w-16 bg-slate-700" />
              ) : (
                <div className="text-2xl font-bold text-white mb-1">{stats.successfulTransactions}</div>
              )}
              <p className="text-xs text-emerald-400">
                {stats.totalTransactions > 0 ? Math.round((stats.successfulTransactions / stats.totalTransactions) * 100) : 0}% success rate
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-slate-400">Pending</CardTitle>
              <div className="p-2 bg-amber-600/20 rounded-lg">
                <Clock className="h-4 w-4 text-amber-400" />
              </div>
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                <Skeleton className="h-8 w-16 bg-slate-700" />
              ) : (
                <div className="text-2xl font-bold text-white mb-1">{stats.pendingTransactions}</div>
              )}
              <p className="text-xs text-slate-400">
                {formatCurrency(stats.pendingAmount, 'NGN')} pending
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-slate-400">Average</CardTitle>
              <div className="p-2 bg-purple-600/20 rounded-lg">
                <TrendingUp className="h-4 w-4 text-purple-400" />
              </div>
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                <Skeleton className="h-8 w-20 bg-slate-700" />
              ) : (
                <div className="text-2xl font-bold text-white mb-1">
                  {formatCurrency(stats.averageTransaction, 'NGN')}
                </div>
              )}
              <p className="text-xs text-slate-400">Per transaction</p>
            </CardContent>
          </Card>
        </div>

        {/* Transactions Table */}
        <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white text-lg font-semibold">Transaction History</CardTitle>
                <CardDescription className="text-slate-400 mt-1">
                  All your payment transactions and their status
                </CardDescription>
              </div>
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-slate-800 border-slate-700 text-white w-64 focus:border-blue-500 transition-colors"
                  />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-32 bg-slate-800 border-slate-700 text-white focus:border-blue-500">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterCurrency} onValueChange={setFilterCurrency}>
                  <SelectTrigger className="w-32 bg-slate-800 border-slate-700 text-white focus:border-blue-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all">All Currency</SelectItem>
                    <SelectItem value="NGN">NGN</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="GHS">GHS</SelectItem>
                    <SelectItem value="KES">KES</SelectItem>
                    <SelectItem value="ZAR">ZAR</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-hidden rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 bg-slate-800/30">
                    <TableHead className="text-slate-400 font-medium py-4 px-6">Reference</TableHead>
                    <TableHead className="text-slate-400 font-medium py-4">Date</TableHead>
                    <TableHead className="text-slate-400 font-medium py-4">Description</TableHead>
                    <TableHead className="text-slate-400 font-medium py-4">Amount</TableHead>
                    <TableHead className="text-slate-400 font-medium py-4">Status</TableHead>
                    <TableHead className="text-slate-400 font-medium py-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactionsLoading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index} className="border-slate-800">
                        <TableCell className="py-4 px-6">
                          <Skeleton className="h-4 w-24 bg-slate-700" />
                        </TableCell>
                        <TableCell className="py-4">
                          <Skeleton className="h-4 w-20 bg-slate-700" />
                        </TableCell>
                        <TableCell className="py-4">
                          <Skeleton className="h-4 w-32 bg-slate-700" />
                        </TableCell>
                        <TableCell className="py-4">
                          <Skeleton className="h-4 w-16 bg-slate-700" />
                        </TableCell>
                        <TableCell className="py-4">
                          <Skeleton className="h-6 w-20 bg-slate-700" />
                        </TableCell>
                        <TableCell className="py-4">
                          <Skeleton className="h-8 w-16 bg-slate-700" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredTransactions.length === 0 ? (
                    <TableRow className="border-slate-800">
                      <TableCell colSpan={6} className="text-center py-8 text-slate-400">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((transaction: Transaction, index: number) => {
                      const statusBadge = getStatusBadge(transaction.status)
                      const StatusIcon = statusBadge.icon
                      
                      return (
                        <TableRow
                          key={transaction.id}
                          className={`border-slate-800 hover:bg-slate-800/30 transition-colors ${
                            index % 2 === 0 ? 'bg-slate-900/20' : 'bg-transparent'
                          }`}
                        >
                          <TableCell className="text-slate-300 font-mono py-4 px-6 text-sm">
                            {transaction.reference}
                          </TableCell>
                          <TableCell className="text-slate-300 py-4">
                            {formatDate(transaction.createdAt)}
                          </TableCell>
                          <TableCell className="text-white font-medium py-4 max-w-xs truncate">
                            {transaction.description || 'No description'}
                          </TableCell>
                          <TableCell className="text-white font-semibold py-4">
                            {formatCurrency(transaction.amount, transaction.currency)}
                          </TableCell>
                          <TableCell className="py-4">
                            <Badge className={statusBadge.className}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {transaction.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedTransaction(transaction)}
                              className="text-slate-400 hover:text-white"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        {transactionsData?.pagination && transactionsData.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">
              Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, transactionsData.pagination.total)} of {transactionsData.pagination.total} transactions
            </p>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
              >
                Previous
              </Button>
              <span className="text-sm text-slate-400">
                Page {page} of {transactionsData.pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => p + 1)}
                disabled={page >= transactionsData.pagination.totalPages}
                className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Transaction Details Dialog */}
      {selectedTransaction && (
        <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle>Transaction Details</DialogTitle>
              <DialogDescription className="text-slate-300">
                Complete information about this transaction
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-400">Reference</Label>
                  <p className="font-mono text-sm">{selectedTransaction.reference}</p>
                </div>
                <div>
                  <Label className="text-slate-400">Status</Label>
                  <div className="mt-1">
                    {(() => {
                      const statusBadge = getStatusBadge(selectedTransaction.status)
                      const StatusIcon = statusBadge.icon
                      return (
                        <Badge className={statusBadge.className}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {selectedTransaction.status}
                        </Badge>
                      )
                    })()}
                  </div>
                </div>
                <div>
                  <Label className="text-slate-400">Amount</Label>
                  <p className="font-semibold text-lg">
                    {formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}
                  </p>
                </div>
                <div>
                  <Label className="text-slate-400">Currency</Label>
                  <p>{selectedTransaction.currency}</p>
                </div>
                <div>
                  <Label className="text-slate-400">Created</Label>
                  <p>{formatDate(selectedTransaction.createdAt)}</p>
                </div>
                <div>
                  <Label className="text-slate-400">Updated</Label>
                  <p>{formatDate(selectedTransaction.updatedAt)}</p>
                </div>
              </div>
              {selectedTransaction.description && (
                <div>
                  <Label className="text-slate-400">Description</Label>
                  <p>{selectedTransaction.description}</p>
                </div>
              )}
              {selectedTransaction.channel && (
                <div>
                  <Label className="text-slate-400">Payment Channel</Label>
                  <p className="capitalize">{selectedTransaction.channel}</p>
                </div>
              )}
              {selectedTransaction.paidAt && (
                <div>
                  <Label className="text-slate-400">Paid At</Label>
                  <p>{formatDate(selectedTransaction.paidAt)}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </EmployeeLayout>
  )
}

// Export with route protection
export default withRouteProtection(TransactionsPage, ['employee'])
