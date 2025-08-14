"use client"

import { useState } from "react"
import { useUserQuery, useRedisMutation } from "@/lib/hooks/use-redis-query"
import { cacheInvalidation } from "@/lib/providers/redis-query-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
  ArrowRight,
  Eye,
  Building2,
  Users,
  Mail,
  Receipt,
  RefreshCw,
  Activity,
} from "lucide-react"
import { EmployeeLayout } from "@/components/dashboard/role-based-layout"
import { withRouteProtection } from "@/lib/auth/route-protection"
import { useAuth } from "@/lib/hooks/use-auth"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import TransactionHistory from "@/components/TransactionHistory"

function EmployeeDashboard() {
  const { user } = useAuth()
  
  // Debug user data
  console.log('👤 Employee Dashboard: User data:', {
    userId: user?.userId,
    email: user?.email,
    role: user?.role,
    hasAccessToken: !!user?.accessToken,
    accessTokenLength: user?.accessToken?.length
  })

  // Manual refresh function
  const handleRefreshData = async () => {
    console.log('🔄 Manual refresh triggered')
    
    // Clear cache for this user
    if (typeof window !== 'undefined') {
      const cacheKeys = [
        `redis_cache_${user?.userId}_notifications`,
        `redis_cache_${user?.userId}_employeeBalance`,
        `redis_cache_${user?.userId}_company-info`,
        `redis_cache_${user?.userId}_employee-transactions`
      ]
      cacheKeys.forEach(key => localStorage.removeItem(key))
    }
    
    // Force refetch all data
    await Promise.all([
      refetchNotifications(),
      refetchBalance(),
      refetchEmployeeTransactions(),
    ])
  }
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)

  // Fetch company information with Redis caching
  const { 
    data: companyData, 
    isLoading: companyLoading,
    isFromCache: companyFromCache 
  } = useUserQuery(
    user?.userId || '',
    'company-info',
    async () => {
      const response = await fetch('/api/employee/company-info', {
        headers: {
          'Authorization': `Bearer ${user?.accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch company information')
      }

      return response.json()
    },
    {
      ttl: 1800, // 30 minutes
      tags: ['company-info', 'employee']
    }
  )

  // Fetch notifications with Redis caching
  const { 
    data: notificationsData, 
    isLoading: notificationsLoading,
    isFromCache: notificationsFromCache,
    refetch: refetchNotifications
  } = useUserQuery(
    user?.userId || '',
    'notifications',
    async () => {
      console.log('🔔 Frontend: Fetching notifications for user:', user?.userId)
      console.log('🔔 Frontend: User access token available:', !!user?.accessToken)
      
      const response = await fetch('/api/employee/notifications', {
        headers: {
          'Authorization': `Bearer ${user?.accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('🔔 Frontend: Notifications response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('🔔 Frontend: Notifications fetch failed:', errorText)
        throw new Error('Failed to fetch notifications')
      }

      const result = await response.json()
      console.log('🔔 Frontend: Notifications data received:', result)
      return result.data
    },
    {
      ttl: 60, // 1 minute for faster updates
      tags: ['notifications', 'employee']
    }
  )

  // Fetch employee balance
  const { 
    data: balanceData, 
    isLoading: balanceLoading,
    isFromCache: balanceFromCache,
    refetch: refetchBalance
  } = useUserQuery(
    user?.userId || '',
    'employeeBalance',
    async () => {
      console.log('💳 Frontend: Fetching balance for user:', user?.userId)
      console.log('💳 Frontend: User access token available:', !!user?.accessToken)
      
      const response = await fetch('/api/employee/balance', {
        headers: {
          'Authorization': `Bearer ${user?.accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('💳 Frontend: Balance response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('💳 Frontend: Balance fetch failed:', errorText)
        throw new Error('Failed to fetch balance')
      }

      const result = await response.json()
      console.log('💳 Frontend: Balance data received:', result)
      return result
    },
    {
      ttl: 60, // 1 minute for faster updates
      tags: ['balance', 'employee']
    }
  )

  // Fetch employee transactions for stats calculation
  const { 
    data: employeeTransactionsData, 
    isLoading: employeeTransactionsLoading,
    isFromCache: employeeTransactionsFromCache,
    refetch: refetchEmployeeTransactions
  } = useUserQuery(
    user?.userId || '',
    'employee-transactions',
    async () => {
      console.log('💳 Frontend: Fetching employee transactions for user:', user?.userId)
      
      const response = await fetch('/api/employee/transactions?limit=100', {
        headers: {
          'Authorization': `Bearer ${user?.accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('💳 Frontend: Employee transactions response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('💳 Frontend: Employee transactions fetch failed:', errorText)
        throw new Error('Failed to fetch employee transactions')
      }

      const result = await response.json()
      console.log('💳 Frontend: Employee transactions data received:', result)
      return result
    },
    {
      ttl: 60, // 1 minute for faster updates
      tags: ['transactions', 'employee']
    }
  )

  // Handle notification actions
  const handleNotificationAction = async (allocationId: string, action: 'accept' | 'reject') => {
    try {
      const response = await fetch('/api/employee/notifications', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ allocationId, action })
      })

      if (!response.ok) {
        throw new Error('Failed to process notification')
      }

      // Force refresh both notifications and balance immediately
      await refetchNotifications() 
      await refetchBalance()
      
      // Also invalidate cache to ensure fresh data
      if (typeof window !== 'undefined') {
        // Clear localStorage cache for this user's data
        const cacheKeys = [
          `redis_cache_${user?.userId}_notifications`,
          `redis_cache_${user?.userId}_employeeBalance`
        ]
        cacheKeys.forEach(key => localStorage.removeItem(key))
      }
    } catch (error) {
      console.error('Failed to process notification:', error)
    }
  }

  // Payment mutation with cache invalidation
  const paymentMutation = useRedisMutation(
    async (paymentData: any) => {
      const response = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentData)
      })

      if (!response.ok) {
        throw new Error('Failed to initialize payment')
      }

      return response.json()
    },
    {
      invalidateTags: ['transactions', 'recent'],
      onSuccess: () => {
        setIsPaymentDialogOpen(false)
        // Show success message
      }
    }
  )

  const transactions = employeeTransactionsData?.transactions || []

  const filteredTransactions = transactions.filter((transaction: any) => {
    const matchesSearch = !searchTerm ||
      transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.reference?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === "all" || transaction.status === filterStatus
    return matchesSearch && matchesFilter
  })

  // Calculate stats from real employee transaction data
  const stats = (employeeTransactionsData?.transactions || []).reduce((acc: any, transaction: any) => {
    // Only count outgoing transactions (transfers sent) for spent amount
    if (transaction.type === 'transfer_sent') {
      acc.totalSpent += Math.abs(transaction.amount) || 0
      acc.totalOutgoingTransactions++
    }
    
    // Count all transactions for total
    acc.totalTransactions++

    if (transaction.status === 'pending') {
      acc.pendingTransactions++
      acc.pendingAmount += Math.abs(transaction.amount) || 0
    } else if (transaction.status === 'completed' || transaction.status === 'success') {
      acc.successfulTransactions++
    }

    return acc
  }, {
    totalSpent: 0,
    totalTransactions: 0,
    pendingTransactions: 0,
    pendingAmount: 0,
    successfulTransactions: 0,
    totalOutgoingTransactions: 0
  })

  // Calculate success rate
  stats.successRate = stats.totalTransactions > 0 ? 
    Math.round((stats.successfulTransactions / stats.totalTransactions) * 100) : 0

  // Calculate average transaction amount
  stats.averageTransaction = stats.totalTransactions > 0 ? 
    stats.totalSpent / stats.totalOutgoingTransactions : 0

  return (
    <EmployeeLayout>
      <div className="space-y-8">
        {/* Cache Status Indicator */}
        {(companyFromCache || employeeTransactionsFromCache || notificationsFromCache || balanceFromCache) && (
          <div className="flex items-center space-x-2 text-xs text-slate-400">
            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
            <span>Some data loaded from cache for faster experience</span>
          </div>
        )}

        {/* Welcome Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Welcome back, {user?.firstName || 'John'}!</h1>
            <p className="text-slate-400">Here's your payment activity overview</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              variant="outline" 
              onClick={handleRefreshData}
              className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
              disabled={balanceLoading || notificationsLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${(balanceLoading || notificationsLoading) ? 'animate-spin' : ''}`} />
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
                <DialogTitle>Make New Payment</DialogTitle>
                <DialogDescription className="text-slate-300">
                  Submit a new payment request for approval
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select>
                    <SelectTrigger className="bg-slate-700 border-slate-600">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="fuel">Fuel</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="supplies">Supplies</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (₵)</Label>
                  <Input id="amount" type="number" placeholder="0.00" className="bg-slate-700 border-slate-600" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    placeholder="Payment description"
                    className="bg-slate-700 border-slate-600"
                  />
                </div>
                <div className="flex space-x-2">
                  <Button 
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    onClick={() => {
                      // Handle payment submission
                      paymentMutation.mutate({
                        amount: 100,
                        currency: 'GHS',
                        description: 'Test payment',
                        channel: 'card'
                      })
                    }}
                  >
                    Submit Request
                  </Button>
                  <Button
                    variant="outline"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                    onClick={() => setIsPaymentDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Notifications Section */}
        {notificationsLoading ? (
          <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white text-lg font-semibold flex items-center">
                <Mail className="w-5 h-5 mr-2 text-blue-400" />
                Notifications
              </CardTitle>
              <CardDescription className="text-slate-400">
                Loading your notifications...
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="p-4 rounded-lg border bg-slate-800/50 border-slate-700">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 bg-slate-700 mb-2" />
                        <Skeleton className="h-3 w-48 bg-slate-700" />
                      </div>
                      <Skeleton className="h-3 w-16 bg-slate-700" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (notificationsData?.notifications?.length > 0) ? (
          <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white text-lg font-semibold flex items-center">
                <Mail className="w-5 h-5 mr-2 text-blue-400" />
                Notifications
                {notificationsData.summary?.unreadCount > 0 && (
                  <Badge className="ml-3 bg-red-500/20 text-red-400 border-red-500/30">
                    {notificationsData.summary.unreadCount} new
                  </Badge>
                )}
                {notificationsFromCache && (
                  <Badge className="ml-2 bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                    Cached
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-slate-400">
                Budget allocations and system notifications
                {notificationsData.summary?.totalPendingAmount > 0 && (
                  <span className="ml-2 text-green-400">
                    • {formatCurrency(notificationsData.summary.totalPendingAmount, 'GHS')} pending
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {notificationsData.notifications.map((notification: any) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg border ${
                      notification.status === 'pending'
                        ? 'bg-blue-500/10 border-blue-500/30' 
                        : 'bg-slate-800/50 border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium text-white">
                            {notification.title}
                          </h4>
                          <Badge 
                            className={`text-xs ${
                              notification.status === 'pending' 
                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            }`}
                          >
                            {notification.status}
                          </Badge>
                          {notification.type === 'budget_allocation' && (
                            <Badge className="text-xs bg-purple-500/20 text-purple-400 border-purple-500/30">
                              {notification.budgetType}
                            </Badge>
                          )}
                          {notification.type === 'invitation' && (
                            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-xs">
                              Invitation
                            </Badge>
                          )}
                          {notification.type === 'system' && (
                            <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30 text-xs">
                              System
                            </Badge>
                          )}
                        </div>
                        <p className="text-slate-400 text-sm mb-3">
                          {notification.message}
                        </p>
                        {notification.description && (
                          <p className="text-slate-500 text-xs mb-3">
                            {notification.description}
                          </p>
                        )}
                        {notification.amount && (
                          <div className="text-sm font-medium text-green-400 mb-3">
                            Amount: {formatCurrency(notification.amount, notification.currency || 'GHS')}
                          </div>
                        )}
                        {notification.type === 'budget_allocation' && notification.status === 'pending' && (
                          <div className="flex space-x-2 mt-3">
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => handleNotificationAction(notification.metadata.allocationId, 'accept')}
                            >
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                              onClick={() => handleNotificationAction(notification.metadata.allocationId, 'reject')}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                        {notification.type === 'invitation' && notification.metadata && (
                          <div className="mt-3 space-y-2">
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              <div>
                                <span className="text-slate-500">Company:</span>
                                <span className="text-slate-300 ml-2">{notification.metadata.companyName}</span>
                              </div>
                              <div>
                                <span className="text-slate-500">Department:</span>
                                <span className="text-slate-300 ml-2">{notification.metadata.department}</span>
                              </div>
                              <div>
                                <span className="text-slate-500">Spending Limit:</span>
                                <span className="text-slate-300 ml-2">₵{notification.metadata.spendingLimit?.toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="text-slate-500">Invited By:</span>
                                <span className="text-slate-300 ml-2">{notification.metadata.invitedBy}</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4 text-xs text-slate-500">
                              <span>Expires: {new Date(notification.expiresAt).toLocaleDateString()}</span>
                              <span>Created: {new Date(notification.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex space-x-2 pt-2">
                              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                                Accept Invitation
                              </Button>
                              <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                                Decline
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        {notification.status === 'pending' && (
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        )}
                        <span className="text-xs text-slate-500">
                          {new Date(notification.timestamp || notification.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white text-lg font-semibold flex items-center">
                <Mail className="w-5 h-5 mr-2 text-blue-400" />
                Notifications
              </CardTitle>
              <CardDescription className="text-slate-400">
                You're all caught up!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Mail className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">No new notifications</p>
                <p className="text-slate-500 text-sm mt-1">You'll see invitations and updates here when they arrive</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-slate-400">Available Balance</CardTitle>
              <div className="p-2 bg-green-600/20 rounded-lg">
                <CreditCard className="h-4 w-4 text-green-400" />
              </div>
            </CardHeader>
            <CardContent>
              {balanceLoading ? (
                <Skeleton className="h-8 w-24 bg-slate-700" />
              ) : (
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(balanceData?.data?.balance?.balance || 0, 'GHS')}
                </div>
              )}
              <p className="text-xs text-slate-400 mt-1">
                Current balance
                {balanceFromCache && (
                  <span className="text-green-400 ml-1">• Cached</span>
                )}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-slate-400">Total Received</CardTitle>
              <div className="p-2 bg-purple-600/20 rounded-lg">
                <TrendingUp className="h-4 w-4 text-purple-400" />
              </div>
            </CardHeader>
            <CardContent>
              {balanceLoading ? (
                <Skeleton className="h-8 w-24 bg-slate-700" />
              ) : (
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(balanceData?.data?.balance?.totalReceived || 0, 'GHS')}
                </div>
              )}
              <p className="text-xs text-slate-400 mt-1">
                Budget allocations
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-slate-400">Total Spent</CardTitle>
              <div className="p-2 bg-blue-600/20 rounded-lg">
                <DollarSign className="h-4 w-4 text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              {employeeTransactionsLoading ? (
                <Skeleton className="h-8 w-24 bg-slate-700" />
              ) : (
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(stats.totalSpent || 0, 'GHS')}
                </div>
              )}
              <p className="text-xs text-slate-400 mt-1">
                Across {stats.totalOutgoingTransactions || 0} outgoing transactions
                {employeeTransactionsFromCache && (
                  <span className="text-green-400 ml-1">• Cached</span>
                )}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-slate-400">Pending Amount</CardTitle>
              <div className="p-2 bg-amber-600/20 rounded-lg">
                <Clock className="h-4 w-4 text-amber-400" />
              </div>
            </CardHeader>
            <CardContent>
              {employeeTransactionsLoading ? (
                <Skeleton className="h-8 w-24 bg-slate-700" />
              ) : (
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(stats.pendingAmount || 0, 'GHS')}
                </div>
              )}
              <p className="text-xs text-slate-400 mt-1">
                {stats.pendingTransactions || 0} pending transactions
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-slate-400">Success Rate</CardTitle>
              <div className="p-2 bg-emerald-600/20 rounded-lg">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent>
              {employeeTransactionsLoading ? (
                <Skeleton className="h-8 w-24 bg-slate-700" />
              ) : (
                <div className="text-2xl font-bold text-white">
                  {stats.successRate || 0}%
                </div>
              )}
              <p className="text-xs text-slate-400 mt-1">
                {stats.successfulTransactions || 0} successful transactions
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-slate-400">Average Transaction</CardTitle>
              <div className="p-2 bg-purple-600/20 rounded-lg">
                <CreditCard className="h-4 w-4 text-purple-400" />
              </div>
            </CardHeader>
            <CardContent>
              {employeeTransactionsLoading ? (
                <Skeleton className="h-8 w-24 bg-slate-700" />
              ) : (
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(stats.averageTransaction, 'GHS')}
                </div>
              )}
              <p className="text-xs text-slate-400 mt-1">
                Per outgoing transaction
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Company Information */}
        {companyData && (
          <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white text-lg font-semibold flex items-center">
                <Building2 className="w-5 h-5 mr-2 text-blue-400" />
                Company Information
                {companyFromCache && (
                  <Badge className="ml-2 bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                    Cached
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-slate-400">
                Your organization details and team information
              </CardDescription>
            </CardHeader>
            <CardContent>
              {companyLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-4 w-32 bg-slate-700" />
                  <Skeleton className="h-4 w-48 bg-slate-700" />
                  <Skeleton className="h-4 w-24 bg-slate-700" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-slate-400 text-sm font-medium">Employee Details</h4>
                      <div className="mt-2 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Name:</span>
                          <span className="text-white">{companyData.employee?.name || 'Not assigned'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Department:</span>
                          <span className="text-white">{companyData.employee?.department || 'Not assigned'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Spending Limit:</span>
                          <span className="text-white">
                            {companyData.employee?.spendingLimit 
                              ? formatCurrency(companyData.employee.spendingLimit, 'GHS')
                              : 'No limit set'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-slate-400 text-sm font-medium">Team Status</h4>
                      <div className="mt-2 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Team Members:</span>
                          <span className="text-white">{companyData.colleagues?.length || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Pending Invitations:</span>
                          <span className="text-white">{companyData.pendingInvitations?.length || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Transaction History */}
        <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white text-lg font-semibold flex items-center">
                  <Receipt className="w-5 h-5 mr-2 text-blue-400" />
                  Transaction History
                  {employeeTransactionsFromCache && (
                    <Badge className="ml-2 bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                      Cached
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Your complete transaction history including transfers and budget allocations
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <TransactionHistory />
          </CardContent>
        </Card>
      </div>
    </EmployeeLayout>
  )
}

// Export with route protection
export default withRouteProtection(EmployeeDashboard, ['employee'])
