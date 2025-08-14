"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
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
  CreditCard,
  DollarSign,
  TrendingUp,
  Users,
  Clock,
  Plus,
  Search,
  Bell,
  Settings,
  LogOut,
  CheckCircle,
  XCircle,
  Building2,
  BarChart3,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Activity,
  Wallet,
  Eye,
  Download,
  Upload
} from "lucide-react"
import Link from "next/link"
import { MerchantLayout } from "@/components/dashboard/role-based-layout"
import { withRouteProtection } from "@/lib/auth/route-protection"
import { useAuth } from "@/lib/hooks/use-auth"
import { formatCurrency, formatDate } from "@/lib/utils"

// Types
interface DashboardStats {
  totalTransactions: number
  totalRevenue: number
  totalTransferVolume: number
  totalFeesCollected: number
  activeEmployees: number
  pendingApprovals: number
  successRate: number
  monthlyGrowth: number
  accountBalance: number
  averageTransactionAmount: number
  feePercentage: number
  transactionBreakdown: {
    completed: number
    pending: number
    failed: number
  }
}

interface RecentTransaction {
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
}

interface Employee {
  id: string
  firstName: string
  lastName: string
  email: string
  status: string
  department?: string
  lastActive?: string
}

function CompanyDashboard() {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")

  // Fetch dashboard statistics
  const {
    data: dashboardStats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats
  } = useQuery({
    queryKey: ['merchant-dashboard-stats'],
    queryFn: async (): Promise<DashboardStats> => {
      const response = await fetch('/api/merchant/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${user?.accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard statistics')
      }

      const data = await response.json()
      console.log('🔍 Dashboard API Response:', data)
      
      // The API returns { success: true, stats: {...} }
      if (data.success && data.stats) {
        return data.stats
      } else {
        throw new Error('Invalid dashboard statistics response')
      }
    },
    enabled: !!user?.accessToken,
    staleTime: 300000, // 5 minutes
    refetchInterval: 600000 // 10 minutes
  })

  // Fetch recent transactions
  const {
    data: recentTransactions,
    isLoading: transactionsLoading
  } = useQuery({
    queryKey: ['merchant-recent-transactions'],
    queryFn: async (): Promise<RecentTransaction[]> => {
      const response = await fetch('/api/merchant/transactions/recent?limit=5', {
        headers: {
          'Authorization': `Bearer ${user?.accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch recent transactions')
      }

      const data = await response.json()
      console.log('🔍 Transactions API Response:', data)
      
      // The API returns { success: true, transactions: [...] }
      if (data.success && data.transactions) {
        return data.transactions
      } else {
        return []
      }
    },
    enabled: !!user?.accessToken,
    staleTime: 60000 // 1 minute
  })

  // Fetch employees
  const {
    data: employees,
    isLoading: employeesLoading
  } = useQuery({
    queryKey: ['merchant-employees'],
    queryFn: async (): Promise<Employee[]> => {
      const response = await fetch('/api/merchant/employees?limit=5', {
        headers: {
          'Authorization': `Bearer ${user?.accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch employees')
      }

      const data = await response.json()
      console.log('🔍 Employees API Response:', data)
      
      // The API returns { success: true, employees: [...] }
      if (data.success && data.employees) {
        return data.employees
      } else {
        return []
      }
    },
    enabled: !!user?.accessToken,
    staleTime: 300000 // 5 minutes
  })

  // Get status color helper
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'success':
      case 'active':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'failed':
      case 'error':
      case 'inactive':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    }
  }

  return (
    <MerchantLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Company Dashboard</h1>
            <p className="text-slate-400">Monitor and manage your organization's payment activities</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchStats()}
              disabled={statsLoading}
              className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${statsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <Link href="/dashboard/company/deposit">
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Upload className="w-4 h-4 mr-2" />
                Company Deposit
              </Button>
            </Link>
            <Link href="/dashboard/company/budget">
              <Button className="bg-purple-600 hover:bg-purple-700 text-white">
                <DollarSign className="w-4 h-4 mr-2" />
                Budget Allocation
              </Button>
            </Link>
            <Link href="/dashboard/company/employees">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Users className="w-4 h-4 mr-2" />
                Manage Employees
              </Button>
            </Link>
          </div>
        </div>

        {/* Error State */}
        {statsError && (
          <Alert className="bg-red-500/20 border-red-500/30">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-400">
              Failed to load dashboard data. Please try again.
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Account Balance */}
          <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">Account Balance</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-24 bg-slate-700 mt-2" />
                  ) : (
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(dashboardStats?.accountBalance || 0, 'GHS')}
                    </p>
                  )}
                </div>
                <div className="p-3 bg-purple-500/20 rounded-lg">
                  <Wallet className="w-6 h-6 text-purple-400" />
                </div>
              </div>
              <div className="flex items-center justify-between mt-4">
                <Link href="/dashboard/company/deposit" className="text-purple-400 text-sm hover:text-purple-300">
                  Add funds →
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetchStats()}
                  disabled={statsLoading}
                  className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/20"
                >
                  <RefreshCw className={`w-4 h-4 ${statsLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Total Revenue */}
          <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">Total Revenue</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-24 bg-slate-700 mt-2" />
                  ) : (
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(dashboardStats?.totalRevenue || 0, 'GHS')}
                    </p>
                  )}
                </div>
                <div className="p-3 bg-emerald-500/20 rounded-lg">
                  <DollarSign className="w-6 h-6 text-emerald-400" />
                </div>
              </div>
              {!statsLoading && dashboardStats && (
                <div className="flex items-center mt-4">
                  <TrendingUp className="w-4 h-4 text-emerald-400 mr-1" />
                  <span className="text-emerald-400 text-sm font-medium">
                    +{(dashboardStats?.monthlyGrowth || 0).toFixed(1)}%
                  </span>
                  <span className="text-slate-400 text-sm ml-1">this month</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Total Transfer Volume */}
          <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">Transfer Volume</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-24 bg-slate-700 mt-2" />
                  ) : (
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(dashboardStats?.totalTransferVolume || 0, 'GHS')}
                    </p>
                  )}
                </div>
                <div className="p-3 bg-blue-500/20 rounded-lg">
                  <Activity className="w-6 h-6 text-blue-400" />
                </div>
              </div>
              {!statsLoading && dashboardStats && (
                <div className="flex items-center mt-4">
                  <BarChart3 className="w-4 h-4 text-blue-400 mr-1" />
                  <span className="text-blue-400 text-sm font-medium">
                    {formatCurrency(dashboardStats?.averageTransactionAmount || 0, 'GHS')}
                  </span>
                  <span className="text-slate-400 text-sm ml-1">avg transaction</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Fees Collected */}
          <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">Fees Collected</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-24 bg-slate-700 mt-2" />
                  ) : (
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(dashboardStats?.totalFeesCollected || 0, 'GHS')}
                    </p>
                  )}
                </div>
                <div className="p-3 bg-amber-500/20 rounded-lg">
                  <CreditCard className="w-6 h-6 text-amber-400" />
                </div>
              </div>
              {!statsLoading && dashboardStats && (
                <div className="flex items-center mt-4">
                  <TrendingUp className="w-4 h-4 text-amber-400 mr-1" />
                  <span className="text-amber-400 text-sm font-medium">
                    {dashboardStats?.feePercentage?.toFixed(2) || 0}%
                  </span>
                  <span className="text-slate-400 text-sm ml-1">of volume</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Transactions */}
          <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">Total Transactions</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16 bg-slate-700 mt-2" />
                  ) : (
                    <p className="text-2xl font-bold text-white">
                      {(dashboardStats?.totalTransactions || 0).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="p-3 bg-indigo-500/20 rounded-lg">
                  <Activity className="w-6 h-6 text-indigo-400" />
                </div>
              </div>
              {!statsLoading && dashboardStats && (
                <div className="flex items-center mt-4">
                  <CheckCircle className="w-4 h-4 text-emerald-400 mr-1" />
                  <span className="text-emerald-400 text-sm font-medium">
                    {(dashboardStats?.successRate || 0).toFixed(1)}%
                  </span>
                  <span className="text-slate-400 text-sm ml-1">success rate</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Employees */}
          <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">Active Employees</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16 bg-slate-700 mt-2" />
                  ) : (
                    <p className="text-2xl font-bold text-white">
                      {(dashboardStats?.activeEmployees || 0).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <Users className="w-6 h-6 text-green-400" />
                </div>
              </div>
              <div className="flex items-center mt-4">
                <Link href="/dashboard/company/employees" className="text-green-400 text-sm hover:text-green-300">
                  Manage employees →
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Pending Approvals */}
          <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm font-medium">Pending Approvals</p>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-16 bg-slate-700 mt-2" />
                  ) : (
                    <p className="text-2xl font-bold text-white">
                      {(dashboardStats?.pendingApprovals || 0).toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="p-3 bg-yellow-500/20 rounded-lg">
                  <Clock className="w-6 h-6 text-yellow-400" />
                </div>
              </div>
              {!statsLoading && dashboardStats && (dashboardStats?.pendingApprovals || 0) > 0 && (
                <div className="flex items-center mt-4">
                  <AlertCircle className="w-4 h-4 text-yellow-400 mr-1" />
                  <span className="text-yellow-400 text-sm font-medium">
                    {dashboardStats?.pendingApprovals || 0} require attention
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Transaction Breakdown */}
        {dashboardStats?.transactionBreakdown && (
          <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white text-xl font-semibold flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-blue-400" />
                Transaction Breakdown
              </CardTitle>
              <CardDescription className="text-slate-400">
                Overview of transaction statuses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-emerald-400">
                    {dashboardStats?.transactionBreakdown?.completed || 0}
                  </div>
                  <div className="text-slate-400 text-sm">Completed</div>
                  <div className="text-emerald-400 text-xs mt-1">
                    {(dashboardStats?.totalTransactions || 0) > 0 
                      ? Math.round(((dashboardStats?.transactionBreakdown?.completed || 0) / (dashboardStats?.totalTransactions || 1)) * 100)
                      : 0}% of total
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-400">
                    {dashboardStats?.transactionBreakdown?.pending || 0}
                  </div>
                  <div className="text-slate-400 text-sm">Pending</div>
                  <div className="text-yellow-400 text-xs mt-1">
                    {(dashboardStats?.totalTransactions || 0) > 0 
                      ? Math.round(((dashboardStats?.transactionBreakdown?.pending || 0) / (dashboardStats?.totalTransactions || 1)) * 100)
                      : 0}% of total
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-red-400">
                    {dashboardStats?.transactionBreakdown?.failed || 0}
                  </div>
                  <div className="text-slate-400 text-sm">Failed</div>
                  <div className="text-red-400 text-xs mt-1">
                    {(dashboardStats?.totalTransactions || 0) > 0 
                      ? Math.round(((dashboardStats?.transactionBreakdown?.failed || 0) / (dashboardStats?.totalTransactions || 1)) * 100)
                      : 0}% of total
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Transactions */}
          <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-xl font-semibold flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-blue-400" />
                  Recent Transactions
                </CardTitle>
                <Link href="/dashboard/company/transactions">
                  <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
                    View All
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
              <CardDescription className="text-slate-400">
                Latest payment activities from your employees
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
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
              ) : recentTransactions && recentTransactions.length > 0 ? (
                <div className="space-y-4">
                  {recentTransactions.map((transaction) => (
                    <div key={transaction.id} className="p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800/70 transition-colors">
                      {/* Transaction Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                            <CreditCard className="w-4 h-4 text-blue-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium text-sm">
                              {transaction.type === 'employee_transfer' ? 'Employee Transfer' : 
                               transaction.type === 'budget_allocation' ? 'Budget Allocation' : 
                               transaction.type}
                            </p>
                            <p className="text-slate-400 text-xs">
                              Ref: {transaction.reference}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-semibold">
                            {formatCurrency(transaction.amount, transaction.currency)}
                          </p>
                          <Badge className={getStatusColor(transaction.status)}>
                            {transaction.status}
                          </Badge>
                        </div>
                      </div>

                      {/* Transaction Details */}
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Description:</span>
                          <span className="text-white">{transaction.description}</span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-slate-400">From:</span>
                          <span className="text-white">
                            {transaction.sender} ({transaction.senderRole})
                          </span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-slate-400">To:</span>
                          <span className="text-white">
                            {transaction.recipient} ({transaction.recipientRole})
                          </span>
                        </div>

                        {transaction.fee > 0 && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Fee:</span>
                            <span className="text-amber-400">
                              {formatCurrency(transaction.fee, transaction.currency)}
                            </span>
                          </div>
                        )}

                        {transaction.netAmount !== transaction.amount && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Net Amount:</span>
                            <span className="text-emerald-400">
                              {formatCurrency(transaction.netAmount, transaction.currency)}
                            </span>
                          </div>
                        )}

                        <div className="flex justify-between">
                          <span className="text-slate-400">Date:</span>
                          <span className="text-slate-300">
                            {formatDate(transaction.createdAt)}
                          </span>
                        </div>

                        {transaction.processedAt && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Processed:</span>
                            <span className="text-slate-300">
                              {formatDate(transaction.processedAt)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Transaction Metadata */}
                      {transaction.metadata && Object.keys(transaction.metadata).length > 0 && (
                        <div className="mt-3 pt-3 border-t border-slate-700">
                          <details className="text-xs">
                            <summary className="text-slate-400 cursor-pointer hover:text-slate-300">
                              View Details
                            </summary>
                            <div className="mt-2 p-2 bg-slate-900/50 rounded text-slate-300">
                              <pre className="whitespace-pre-wrap">
                                {JSON.stringify(transaction.metadata, null, 2)}
                              </pre>
                            </div>
                          </details>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400">No recent transactions</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Employees */}
          <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white text-xl font-semibold flex items-center">
                  <Users className="w-5 h-5 mr-2 text-purple-400" />
                  Team Members
                </CardTitle>
                <Link href="/dashboard/company/employees">
                  <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300">
                    Manage All
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
              <CardDescription className="text-slate-400">
                Your active team members
              </CardDescription>
            </CardHeader>
            <CardContent>
              {employeesLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Skeleton className="w-10 h-10 rounded-full bg-slate-700" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32 bg-slate-700" />
                          <Skeleton className="h-3 w-24 bg-slate-700" />
                        </div>
                      </div>
                      <Skeleton className="h-6 w-16 bg-slate-700" />
                    </div>
                  ))}
                </div>
              ) : employees && employees.length > 0 ? (
                <div className="space-y-4">
                  {employees.map((employee) => (
                    <div key={employee.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg hover:bg-slate-800/70 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                          <span className="text-purple-400 font-semibold">
                            {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            {employee.firstName} {employee.lastName}
                          </p>
                          <p className="text-slate-400 text-sm">{employee.email}</p>
                          {employee.department && (
                            <p className="text-slate-500 text-xs">{employee.department}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge className={getStatusColor(employee.status)}>
                          {employee.status}
                        </Badge>
                        {employee.lastActive && (
                          <p className="text-slate-500 text-xs mt-1">
                            {formatDate(employee.lastActive)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                  <p className="text-slate-400 mb-3">No employees yet</p>
                  <Link href="/dashboard/company/employees">
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Invite Employees
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm hover:bg-slate-900/70 transition-all duration-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-lg font-semibold flex items-center">
                <Users className="w-5 h-5 mr-2 text-blue-400" />
                Manage Employees
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400 text-sm mb-4">
                Add, remove, and manage your team members
              </p>
              <Button asChild className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                <Link href="/dashboard/company/employees">
                  <Users className="w-4 h-4 mr-2" />
                  Manage Team
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm hover:bg-slate-900/70 transition-all duration-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-lg font-semibold flex items-center">
                <Upload className="w-5 h-5 mr-2 text-emerald-400" />
                Company Deposit
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400 text-sm mb-4">
                Add funds to your company account via Paystack
              </p>
              <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                <Link href="/dashboard/company/deposit">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Deposit Funds
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm hover:bg-slate-900/70 transition-all duration-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-lg font-semibold flex items-center">
                <Activity className="w-5 h-5 mr-2 text-purple-400" />
                View Reports
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400 text-sm mb-4">
                Generate and view detailed financial reports
              </p>
              <Button asChild className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                <Link href="/dashboard/company/reports">
                  <Download className="w-4 h-4 mr-2" />
                  View Reports
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </MerchantLayout>
  )
}

export default withRouteProtection(CompanyDashboard, ['merchant'])
