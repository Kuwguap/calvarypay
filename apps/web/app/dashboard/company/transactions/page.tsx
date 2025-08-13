"use client"

import { useState } from "react"
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
  Activity,
  Search,
  Filter,
  Download,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  MoreHorizontal,
  Calendar,
  DollarSign,
  User,
  FileText
} from "lucide-react"
import { MerchantLayout } from "@/components/dashboard/role-based-layout"
import { withRouteProtection } from "@/lib/auth/route-protection"
import { useAuth } from "@/lib/hooks/use-auth"
import { formatCurrency, formatDate } from "@/lib/utils"
import Link from "next/link"

// Types
interface Transaction {
  id: string
  reference: string
  employee: string
  employeeEmail: string
  amount: number
  currency: string
  status: string
  description: string
  category: string
  channel: string
  createdAt: string
  metadata?: any
}

function TransactionsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  // State
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [dateRange, setDateRange] = useState("30")
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)

  // Fetch transactions
  const {
    data: transactionsData,
    isLoading: transactionsLoading,
    error: transactionsError,
    refetch: refetchTransactions
  } = useQuery({
    queryKey: ['merchant-transactions', searchTerm, statusFilter, categoryFilter, dateRange],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (categoryFilter !== 'all') params.append('category', categoryFilter)
      params.append('days', dateRange)
      params.append('limit', '100')

      const response = await fetch(`/api/merchant/transactions?${params}`, {
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
    staleTime: 60000, // 1 minute
  })

  // Approve/Reject transaction mutation
  const updateTransactionMutation = useMutation({
    mutationFn: async ({ transactionId, action }: { transactionId: string; action: 'approve' | 'reject' }) => {
      const response = await fetch(`/api/merchant/transactions/${transactionId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${user?.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to update transaction')
      }

      return response.json()
    },
    onSuccess: () => {
      // Refresh transactions list
      queryClient.invalidateQueries({ queryKey: ['merchant-transactions'] })
      queryClient.invalidateQueries({ queryKey: ['merchant-dashboard-stats'] })
    },
    onError: (error: unknown) => {
      console.error('Transaction update failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to update transaction'
      console.error('Error message:', errorMessage)
    }
  })

  // Export transactions
  const handleExportTransactions = async (format: 'csv' | 'pdf') => {
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (categoryFilter !== 'all') params.append('category', categoryFilter)
      params.append('days', dateRange)
      params.append('format', format)

      const response = await fetch(`/api/merchant/transactions/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${user?.accessToken}`,
        }
      })

      if (!response.ok) {
        throw new Error('Failed to export transactions')
      }

      // Download the file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `merchant-transactions-${dateRange}days.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  // Handle transaction action
  const handleTransactionAction = (transactionId: string, action: 'approve' | 'reject') => {
    updateTransactionMutation.mutate({ transactionId, action })
  }

  // View transaction details
  const viewTransactionDetails = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setIsDetailsDialogOpen(true)
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'success':
      case 'approved':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'failed':
      case 'error':
      case 'rejected':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    }
  }

  const transactions = transactionsData?.transactions || []

  return (
    <MerchantLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/company">
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Transaction Management</h1>
              <p className="text-slate-400">Monitor and manage all company transactions</p>
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportTransactions('csv')}
              className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportTransactions('pdf')}
              className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
            >
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white text-lg font-semibold flex items-center">
              <Filter className="w-5 h-5 mr-2 text-blue-400" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search" className="text-slate-300">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="search"
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-slate-800 border-slate-700 text-white focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status" className="text-slate-300">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category" className="text-slate-300">Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="fuel">Fuel</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="toll">Toll Fees</SelectItem>
                    <SelectItem value="parking">Parking</SelectItem>
                    <SelectItem value="food">Food & Meals</SelectItem>
                    <SelectItem value="accommodation">Accommodation</SelectItem>
                    <SelectItem value="supplies">Office Supplies</SelectItem>
                    <SelectItem value="transport">Transportation</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateRange" className="text-slate-300">Date Range</Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="365">Last year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {transactionsError && (
          <Alert className="bg-red-500/20 border-red-500/30">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-400">
              Failed to load transactions. Please try again.
            </AlertDescription>
          </Alert>
        )}

        {/* Transactions Table */}
        <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-xl font-semibold flex items-center">
                <Activity className="w-5 h-5 mr-2 text-blue-400" />
                Company Transactions
                {!transactionsLoading && (
                  <Badge className="ml-3 bg-blue-500/20 text-blue-400 border-blue-500/30">
                    {transactions.length} transactions
                  </Badge>
                )}
              </CardTitle>
            </div>
            <CardDescription className="text-slate-400">
              All transactions from your employees
            </CardDescription>
          </CardHeader>
          <CardContent>
            {transactionsLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Skeleton className="w-10 h-10 rounded-full bg-slate-700" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32 bg-slate-700" />
                        <Skeleton className="h-3 w-24 bg-slate-700" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-20 bg-slate-700" />
                  </div>
                ))}
              </div>
            ) : transactions.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700">
                      <TableHead className="text-slate-300">Reference</TableHead>
                      <TableHead className="text-slate-300">Employee</TableHead>
                      <TableHead className="text-slate-300">Amount</TableHead>
                      <TableHead className="text-slate-300">Category</TableHead>
                      <TableHead className="text-slate-300">Status</TableHead>
                      <TableHead className="text-slate-300">Date</TableHead>
                      <TableHead className="text-slate-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id} className="border-slate-700">
                        <TableCell className="text-white font-mono text-sm">
                          {transaction.reference}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-white font-medium">{transaction.employee}</p>
                            <p className="text-slate-400 text-sm">{transaction.employeeEmail}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-white font-semibold">
                          {formatCurrency(transaction.amount, transaction.currency)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-slate-600 text-slate-300 capitalize">
                            {transaction.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(transaction.status)}>
                            {transaction.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-400">
                          {formatDate(transaction.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => viewTransactionDetails(transaction)}
                              className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/20"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {transaction.status === 'pending' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleTransactionAction(transaction.id, 'approve')}
                                  disabled={updateTransactionMutation.isPending}
                                  className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/20"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleTransactionAction(transaction.id, 'reject')}
                                  disabled={updateTransactionMutation.isPending}
                                  className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Activity className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Transactions Found</h3>
                <p className="text-slate-400 mb-6">
                  No transactions match your current filters. Try adjusting your search criteria.
                </p>
                <Button
                  onClick={() => {
                    setSearchTerm("")
                    setStatusFilter("all")
                    setCategoryFilter("all")
                    setDateRange("30")
                  }}
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transaction Details Dialog */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-white">Transaction Details</DialogTitle>
              <DialogDescription className="text-slate-400">
                Complete information about this transaction
              </DialogDescription>
            </DialogHeader>
            {selectedTransaction && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div>
                      <label className="text-slate-400 text-sm">Reference</label>
                      <p className="text-white font-mono">{selectedTransaction.reference}</p>
                    </div>
                    <div>
                      <label className="text-slate-400 text-sm">Employee</label>
                      <p className="text-white">{selectedTransaction.employee}</p>
                      <p className="text-slate-400 text-sm">{selectedTransaction.employeeEmail}</p>
                    </div>
                    <div>
                      <label className="text-slate-400 text-sm">Amount</label>
                      <p className="text-white font-semibold text-lg">
                        {formatCurrency(selectedTransaction.amount, selectedTransaction.currency)}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-slate-400 text-sm">Status</label>
                      <div className="mt-1">
                        <Badge className={getStatusColor(selectedTransaction.status)}>
                          {selectedTransaction.status}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <label className="text-slate-400 text-sm">Category</label>
                      <p className="text-white capitalize">{selectedTransaction.category}</p>
                    </div>
                    <div>
                      <label className="text-slate-400 text-sm">Channel</label>
                      <p className="text-white capitalize">{selectedTransaction.channel}</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="text-slate-400 text-sm">Description</label>
                  <p className="text-white">{selectedTransaction.description}</p>
                </div>
                
                <div>
                  <label className="text-slate-400 text-sm">Date & Time</label>
                  <p className="text-white">{formatDate(selectedTransaction.createdAt)}</p>
                </div>

                {selectedTransaction.status === 'pending' && (
                  <div className="flex space-x-3 pt-4 border-t border-slate-700">
                    <Button
                      onClick={() => {
                        handleTransactionAction(selectedTransaction.id, 'approve')
                        setIsDetailsDialogOpen(false)
                      }}
                      disabled={updateTransactionMutation.isPending}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve Transaction
                    </Button>
                    <Button
                      onClick={() => {
                        handleTransactionAction(selectedTransaction.id, 'reject')
                        setIsDetailsDialogOpen(false)
                      }}
                      disabled={updateTransactionMutation.isPending}
                      variant="destructive"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject Transaction
                    </Button>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </MerchantLayout>
  )
}

export default withRouteProtection(TransactionsPage, ['merchant'])
