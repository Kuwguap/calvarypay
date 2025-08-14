"use client"

import { useState, useEffect } from "react"
import { useGlobalQuery } from "@/lib/hooks/use-redis-query"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Download, 
  Filter, 
  Search, 
  Calendar, 
  User, 
  Building2, 
  ArrowUpRight, 
  ArrowDownLeft,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FileText,
  BarChart3,
  RefreshCw,
  Users,
  TrendingUp
} from "lucide-react"
import { withRouteProtection } from "@/lib/auth/route-protection"
import { formatCurrency } from "@/lib/utils"
import { useAuth } from "@/lib/hooks/use-auth"
import { MerchantLayout } from "@/components/dashboard/role-based-layout"

// Types
interface Transaction {
  id: string
  reference: string
  type: string
  amount: number
  currency: string
  status: string
  description: string
  createdAt: string
  processedAt?: string
  category: string
  sender: string
  senderEmail: string
  senderRole: string
  recipient: string
  recipientEmail: string
  recipientRole: string
  transferType: string
  fee: number
  netAmount: number
  metadata: any
  department?: string
}

interface TransactionStats {
  totalTransactions: number
  totalAmount: number
  totalFees: number
  completedTransactions: number
  pendingTransactions: number
  failedTransactions: number
  byDepartment: Record<string, { count: number; amount: number }>
}

interface Department {
  id: string
  name: string
  employeeCount: number
  totalBudget: number
}

function CompanyTransactionsPage() {
  const { user } = useAuth()
  
  // State
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [departmentFilter, setDepartmentFilter] = useState("all")
  const [dateRange, setDateRange] = useState("30")
  const [pageSize, setPageSize] = useState(25)
  const [currentPage, setCurrentPage] = useState(1)
  const [exportFormat, setExportFormat] = useState<"csv" | "pdf">("csv")

  // Fetch transactions data
  const {
    data: transactionsData,
    isLoading: transactionsLoading,
    error: transactionsError,
    refetch: refetchTransactions
  } = useGlobalQuery(
    `merchant-transactions-${dateRange}`,
    async () => {
      const response = await fetch(`/api/merchant/transactions/recent?limit=1000&days=${dateRange}`)
      if (!response.ok) {
        throw new Error('Failed to fetch transactions')
      }
      return response.json()
    },
    {
      ttl: 5 * 60, // 5 minutes
      tags: ['merchant-transactions']
    }
  )

  // Fetch dashboard stats
  const {
    data: statsData,
    isLoading: statsLoading
  } = useGlobalQuery(
    'merchant-dashboard-stats',
    async () => {
      const response = await fetch('/api/merchant/dashboard/stats')
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats')
      }
      return response.json()
    },
    {
      ttl: 5 * 60, // 5 minutes
      tags: ['merchant-stats']
    }
  )

  // Fetch employee balances for transaction context
  const {
    data: employeeBalancesData,
    isLoading: employeeBalancesLoading
  } = useGlobalQuery(
    'merchant-employee-balances',
    async () => {
      const response = await fetch('/api/merchant/employees?limit=100')
      if (!response.ok) {
        throw new Error('Failed to fetch employee balances')
      }
      return response.json()
    },
    {
      ttl: 10 * 60, // 10 minutes
      tags: ['merchant-employees']
    }
  )

  // Mock departments data (replace with real API call)
  const departments: Department[] = [
    { id: 'eng', name: 'Engineering', employeeCount: 5, totalBudget: 5000 },
    { id: 'mkt', name: 'Marketing', employeeCount: 3, totalBudget: 3000 },
    { id: 'sales', name: 'Sales', employeeCount: 4, totalBudget: 4000 },
    { id: 'hr', name: 'Human Resources', employeeCount: 2, totalBudget: 2000 },
    { id: 'finance', name: 'Finance', employeeCount: 3, totalBudget: 3500 }
  ]

  // Process and filter transactions
  const processedTransactions = transactionsData?.transactions || []
  const filteredTransactions = processedTransactions.filter((transaction: Transaction) => {
    const matchesSearch = !searchTerm || 
      transaction.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.sender.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.recipient.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === "all" || transaction.status === statusFilter
    const matchesType = typeFilter === "all" || transaction.type === typeFilter
    const matchesDepartment = departmentFilter === "all" || transaction.department === departmentFilter
    
    return matchesSearch && matchesStatus && matchesType && matchesDepartment
  })

  // Pagination
  const totalPages = Math.ceil(filteredTransactions.length / pageSize)
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedTransactions = filteredTransactions.slice(startIndex, endIndex)

  // Calculate transaction stats with department breakdown
  const transactionStats: TransactionStats = {
    totalTransactions: filteredTransactions.length,
    totalAmount: filteredTransactions.reduce((sum, t) => sum + (t.amount || 0), 0),
    totalFees: filteredTransactions.reduce((sum, t) => sum + (t.fee || 0), 0),
    completedTransactions: filteredTransactions.filter(t => t.status === 'completed').length,
    pendingTransactions: filteredTransactions.filter(t => t.status === 'pending').length,
    failedTransactions: filteredTransactions.filter(t => t.status === 'failed').length,
    byDepartment: filteredTransactions.reduce((acc, t) => {
      const dept = t.department || 'Unknown'
      if (!acc[dept]) {
        acc[dept] = { count: 0, amount: 0 }
      }
      acc[dept].count++
      acc[dept].amount += t.amount || 0
      return acc
    }, {} as Record<string, { count: number; amount: number }>)
  }

  // Export functions
  const exportToCSV = () => {
    const headers = [
      'Reference', 'Type', 'Amount', 'Currency', 'Status', 'Description', 
      'Department', 'Sender', 'Recipient', 'Fee', 'Net Amount', 'Created At', 'Processed At'
    ]
    
    const csvContent = [
      headers.join(','),
      ...paginatedTransactions.map((t: Transaction) => [
        t.reference,
        t.type,
        t.amount,
        t.currency,
        t.status,
        `"${t.description}"`,
        t.department || 'Unknown',
        t.sender,
        t.recipient,
        t.fee,
        t.netAmount,
        t.createdAt,
        t.processedAt || ''
      ].join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `company-transactions-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const exportToPDF = () => {
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>Company Transactions Report</title></head>
          <body>
            <h1>Company Transactions Report</h1>
            <p>Generated: ${new Date().toLocaleString()}</p>
            <table border="1" style="width:100%; border-collapse: collapse;">
              <thead>
                <tr>
                  <th>Reference</th><th>Type</th><th>Amount</th><th>Status</th><th>Description</th><th>Department</th>
                </tr>
              </thead>
              <tbody>
                ${paginatedTransactions.map((t: Transaction) => `
                  <tr>
                    <td>${t.reference}</td>
                    <td>${t.type}</td>
                    <td>${formatCurrency(t.amount, t.currency)}</td>
                    <td>${t.status}</td>
                    <td>${t.description}</td>
                    <td>${t.department || 'Unknown'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const handleExport = () => {
    if (exportFormat === 'csv') {
      exportToCSV()
    } else {
      exportToPDF()
    }
  }

  // Loading state
  if (transactionsLoading || statsLoading || employeeBalancesLoading) {
    return (
      <MerchantLayout>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading transactions...</p>
            </div>
          </div>
        </div>
      </MerchantLayout>
    )
  }

  // Error state
  if (transactionsError) {
    return (
      <MerchantLayout>
        <div className="container mx-auto p-6">
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Error Loading Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                {transactionsError.message || 'An error occurred while loading transactions'}
              </p>
              <Button onClick={() => refetchTransactions()} variant="outline">
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </MerchantLayout>
    )
  }

  return (
    <MerchantLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Company Transactions</h1>
            <p className="text-muted-foreground">
              Monitor and analyze all financial transactions within your organization
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={exportFormat} onValueChange={(value: "csv" | "pdf") => setExportFormat(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV Export</SelectItem>
                <SelectItem value="pdf">PDF Export</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleExport} disabled={filteredTransactions.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export {exportFormat.toUpperCase()}
            </Button>
          </div>
        </div>

        {/* Department Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {departments.map((dept) => {
            const deptStats = transactionStats.byDepartment[dept.name] || { count: 0, amount: 0 }
            return (
              <Card key={dept.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    {dept.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-2xl font-bold">{deptStats.count}</div>
                    <div className="text-sm text-muted-foreground">
                      {formatCurrency(deptStats.amount, 'GHS')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {dept.employeeCount} employees
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{transactionStats.totalTransactions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(transactionStats.totalAmount, 'GHS')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Fees</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(transactionStats.totalFees, 'GHS')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{transactionStats.completedTransactions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{transactionStats.pendingTransactions}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{transactionStats.failedTransactions}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="deposit">Deposit</SelectItem>
                    <SelectItem value="withdrawal">Withdrawal</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="allocation">Allocation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.name}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateRange">Date Range</Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Recent Transactions</span>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Showing {startIndex + 1}-{Math.min(endIndex, filteredTransactions.length)} of {filteredTransactions.length}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchTransactions()}
                  disabled={transactionsLoading}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No transactions found</p>
                {searchTerm || statusFilter !== "all" || typeFilter !== "all" || departmentFilter !== "all" ? (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchTerm("")
                      setStatusFilter("all")
                      setTypeFilter("all")
                      setDepartmentFilter("all")
                    }}
                    className="mt-2"
                  >
                    Clear Filters
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="space-y-4">
                {paginatedTransactions.map((transaction: Transaction) => (
                  <div key={transaction.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={transaction.status === 'completed' ? 'default' : transaction.status === 'pending' ? 'secondary' : 'destructive'}>
                            {transaction.status}
                          </Badge>
                          <span className="font-mono text-sm text-muted-foreground">
                            {transaction.reference}
                          </span>
                          {transaction.department && (
                            <Badge variant="outline" className="text-xs">
                              {transaction.department}
                            </Badge>
                          )}
                        </div>
                        <p className="font-medium">{transaction.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">
                          {formatCurrency(transaction.amount, transaction.currency)}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {transaction.fee > 0 && `Fee: ${formatCurrency(transaction.fee, transaction.currency)}`}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <ArrowUpRight className="h-4 w-4 text-green-600" />
                          <span className="font-medium">From:</span>
                          <span>{transaction.sender}</span>
                          <Badge variant="outline" className="text-xs">
                            {transaction.senderRole}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <ArrowDownLeft className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">To:</span>
                          <span>{transaction.recipient}</span>
                          <Badge variant="outline" className="text-xs">
                            {transaction.recipientRole}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">Created:</span>
                          <span>{new Date(transaction.createdAt).toLocaleDateString()}</span>
                        </div>
                        {transaction.processedAt && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">Processed:</span>
                            <span>{new Date(transaction.processedAt).toLocaleDateString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {transaction.metadata && Object.keys(transaction.metadata).length > 0 && (
                      <div className="pt-3 border-t">
                        <details className="text-sm">
                          <summary className="cursor-pointer font-medium text-muted-foreground">
                            View Details
                          </summary>
                          <div className="mt-2 p-3 bg-muted rounded-md">
                            <pre className="text-xs overflow-x-auto">
                              {JSON.stringify(transaction.metadata, null, 2)}
                            </pre>
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </MerchantLayout>
  )
}

export default withRouteProtection(CompanyTransactionsPage) 