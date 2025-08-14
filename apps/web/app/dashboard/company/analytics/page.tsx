"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Activity,
  BarChart3,
  PieChart,
  LineChart,
  Target,
  Calendar,
  RefreshCw,
  Download,
  Eye,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from "lucide-react"
import { MerchantLayout } from "@/components/dashboard/role-based-layout"
import { withRouteProtection } from "@/lib/auth/route-protection"
import { useAuth } from "@/lib/hooks/use-auth"
import { formatCurrency, formatDate } from "@/lib/utils"

// Types
interface AnalyticsData {
  overview: {
    totalTransactions: number
    totalRevenue: number
    totalTransferVolume: number
    totalFeesCollected: number
    activeEmployees: number
    successRate: number
    averageTransactionAmount: number
    monthlyGrowth: number
  }
  trends: {
    daily: Array<{ date: string; amount: number; count: number }>
    weekly: Array<{ week: string; amount: number; count: number }>
    monthly: Array<{ month: string; amount: number; count: number }>
  }
  breakdown: {
    byStatus: Array<{ status: string; count: number; amount: number }>
    byType: Array<{ type: string; count: number; amount: number }>
    byEmployee: Array<{ employee: string; count: number; amount: number }>
    byCategory: Array<{ category: string; count: number; amount: number }>
  }
  performance: {
    topPerformers: Array<{ employee: string; transactions: number; amount: number; successRate: number }>
    riskMetrics: {
      failedTransactions: number
      pendingTransactions: number
      averageProcessingTime: number
      complianceScore: number
    }
  }
}

function CompanyAnalyticsPage() {
  const { user } = useAuth()
  const [timeRange, setTimeRange] = useState("30")
  const [viewType, setViewType] = useState("overview")
  const [departmentFilter, setDepartmentFilter] = useState("all")

  // Mock departments data (replace with real API call)
  const departments = [
    { id: 'all', name: 'All Departments' },
    { id: 'eng', name: 'Engineering' },
    { id: 'mkt', name: 'Marketing' },
    { id: 'sales', name: 'Sales' },
    { id: 'hr', name: 'Human Resources' },
    { id: 'finance', name: 'Finance' }
  ]

  // Fetch analytics data
  const {
    data: analyticsData,
    isLoading: analyticsLoading,
    error: analyticsError,
    refetch: refetchAnalytics
  } = useQuery({
    queryKey: ['merchant-analytics', timeRange, viewType],
    queryFn: async (): Promise<AnalyticsData> => {
      const response = await fetch(`/api/merchant/analytics?days=${timeRange}&view=${viewType}`, {
        headers: {
          'Authorization': `Bearer ${user?.accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch analytics data')
      }

      return response.json()
    },
    enabled: !!user?.accessToken,
    staleTime: 300000, // 5 minutes
  })

  // Calculate growth indicators
  const growthIndicators = useMemo(() => {
    if (!analyticsData?.overview) return {}
    
    const { monthlyGrowth, successRate } = analyticsData.overview
    
    return {
      monthlyGrowth: {
        value: monthlyGrowth,
        trend: monthlyGrowth > 0 ? 'up' : monthlyGrowth < 0 ? 'down' : 'neutral',
        color: monthlyGrowth > 0 ? 'text-emerald-400' : monthlyGrowth < 0 ? 'text-red-400' : 'text-slate-400'
      },
      successRate: {
        value: successRate,
        trend: successRate > 80 ? 'up' : successRate > 60 ? 'neutral' : 'down',
        color: successRate > 80 ? 'text-emerald-400' : successRate > 60 ? 'text-yellow-400' : 'text-red-400'
      }
    }
  }, [analyticsData?.overview])

  // Calculate performance metrics
  const performanceMetrics = useMemo(() => {
    if (!analyticsData?.overview) return {}
    
    const { totalTransactions, totalRevenue, totalTransferVolume, totalFeesCollected } = analyticsData.overview
    
    return {
      transactionEfficiency: totalTransactions > 0 ? (totalRevenue / totalTransactions) : 0,
      feeEfficiency: totalTransferVolume > 0 ? (totalFeesCollected / totalTransferVolume) * 100 : 0,
      revenuePerTransaction: totalTransactions > 0 ? (totalRevenue / totalTransactions) : 0
    }
  }, [analyticsData?.overview])

  if (analyticsError) {
    return (
      <MerchantLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load analytics: {analyticsError.message}
          </AlertDescription>
        </Alert>
      </MerchantLayout>
    )
  }

  return (
    <MerchantLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Analytics Dashboard</h1>
            <p className="text-slate-400">Advanced insights and performance metrics for your business</p>
          </div>
          <div className="flex items-center space-x-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32 bg-slate-800 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchAnalytics()}
              disabled={analyticsLoading}
              className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${analyticsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Department Filter */}
        <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white text-lg">Department Filter</CardTitle>
            <CardDescription className="text-slate-400">
              Filter analytics data by specific departments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {departments.map((dept) => (
                <Button
                  key={dept.id}
                  variant={departmentFilter === dept.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setDepartmentFilter(dept.id)}
                  className={departmentFilter === dept.id 
                    ? "bg-blue-600 hover:bg-blue-700" 
                    : "border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                  }
                >
                  {dept.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Overview Metrics */}
        {analyticsData?.overview && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm font-medium">Total Revenue</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(analyticsData.overview.totalRevenue, 'GHS')}
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-500/20 rounded-lg">
                    <DollarSign className="w-6 h-6 text-emerald-400" />
                  </div>
                </div>
                <div className="flex items-center mt-4">
                  {growthIndicators.monthlyGrowth.trend === 'up' ? (
                    <ArrowUpRight className="w-4 h-4 text-emerald-400 mr-1" />
                  ) : growthIndicators.monthlyGrowth.trend === 'down' ? (
                    <ArrowDownRight className="w-4 h-4 text-red-400 mr-1" />
                  ) : (
                    <Minus className="w-4 h-4 text-slate-400 mr-1" />
                  )}
                  <span className={`text-sm font-medium ${growthIndicators.monthlyGrowth.color}`}>
                    {Math.abs(growthIndicators.monthlyGrowth.value).toFixed(1)}%
                  </span>
                  <span className="text-slate-400 text-sm ml-1">vs last month</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm font-medium">Success Rate</p>
                    <p className="text-2xl font-bold text-white">
                      {analyticsData.overview.successRate.toFixed(1)}%
                    </p>
                  </div>
                  <div className="p-3 bg-blue-500/20 rounded-lg">
                    <Target className="w-6 h-6 text-blue-400" />
                  </div>
                </div>
                <div className="flex items-center mt-4">
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${analyticsData.overview.successRate}%` }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm font-medium">Avg Transaction</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(analyticsData.overview.averageTransactionAmount, 'GHS')}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-500/20 rounded-lg">
                    <Activity className="w-6 h-6 text-purple-400" />
                  </div>
                </div>
                <div className="flex items-center mt-4">
                  <span className="text-slate-400 text-sm">
                    {analyticsData.overview.totalTransactions} total transactions
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm font-medium">Active Employees</p>
                    <p className="text-2xl font-bold text-white">
                      {analyticsData.overview.activeEmployees}
                    </p>
                  </div>
                  <div className="p-3 bg-green-500/20 rounded-lg">
                    <Users className="w-6 h-6 text-green-400" />
                  </div>
                </div>
                <div className="flex items-center mt-4">
                  <span className="text-slate-400 text-sm">
                    Processing transactions
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Performance Metrics */}
        {analyticsData?.overview && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white text-lg">Transaction Efficiency</CardTitle>
                <CardDescription className="text-slate-400">
                  Revenue per transaction
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-emerald-400 mb-2">
                    {formatCurrency(performanceMetrics.transactionEfficiency || 0, 'GHS')}
                  </div>
                  <p className="text-slate-400 text-sm">
                    Average revenue generated per transaction
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white text-lg">Fee Efficiency</CardTitle>
                <CardDescription className="text-slate-400">
                  Fee percentage of transfer volume
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-amber-400 mb-2">
                    {(performanceMetrics.feeEfficiency || 0).toFixed(2)}%
                  </div>
                  <p className="text-slate-400 text-sm">
                    Fee revenue as percentage of total volume
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white text-lg">Transfer Volume</CardTitle>
                <CardDescription className="text-slate-400">
                  Total amount processed
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-400 mb-2">
                    {formatCurrency(analyticsData.overview.totalTransferVolume, 'GHS')}
                  </div>
                  <p className="text-slate-400 text-sm">
                    Total amount transferred across all transactions
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Detailed Analytics Tabs */}
        <Tabs value={viewType} onValueChange={setViewType} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-slate-800 border-slate-600">
            <TabsTrigger value="overview" className="text-slate-300 data-[state=active]:bg-slate-700">
              Overview
            </TabsTrigger>
            <TabsTrigger value="trends" className="text-slate-300 data-[state=active]:bg-slate-700">
              Trends
            </TabsTrigger>
            <TabsTrigger value="breakdown" className="text-slate-300 data-[state=active]:bg-slate-700">
              Breakdown
            </TabsTrigger>
            <TabsTrigger value="performance" className="text-slate-300 data-[state=active]:bg-slate-700">
              Performance
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Transaction Status Distribution */}
              <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white">Transaction Status Distribution</CardTitle>
                  <CardDescription className="text-slate-400">
                    Breakdown by transaction status
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analyticsData?.breakdown?.byStatus ? (
                    <div className="space-y-4">
                      {analyticsData.breakdown.byStatus.map((status) => (
                        <div key={status.status} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-3 h-3 rounded-full ${
                              status.status === 'completed' ? 'bg-emerald-500' :
                              status.status === 'pending' ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`} />
                            <span className="text-white capitalize">{status.status}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-white font-medium">{status.count}</div>
                            <div className="text-slate-400 text-sm">
                              {formatCurrency(status.amount, 'GHS')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <BarChart3 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">No status data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Transaction Type Distribution */}
              <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white">Transaction Type Distribution</CardTitle>
                  <CardDescription className="text-slate-400">
                    Breakdown by transaction type
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analyticsData?.breakdown?.byType ? (
                    <div className="space-y-4">
                      {analyticsData.breakdown.byType.map((type) => (
                        <div key={type.type} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 rounded-full bg-blue-500" />
                            <span className="text-white capitalize">
                              {type.type.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="text-right">
                            <div className="text-white font-medium">{type.count}</div>
                            <div className="text-slate-400 text-sm">
                              {formatCurrency(type.amount, 'GHS')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <PieChart className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">No type data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Trends Tab */}
          <TabsContent value="trends" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Trends */}
              <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white">Daily Transaction Trends</CardTitle>
                  <CardDescription className="text-slate-400">
                    Transaction volume over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analyticsData?.trends?.daily && analyticsData.trends.daily.length > 0 ? (
                    <div className="space-y-3">
                      {analyticsData.trends.daily.slice(-7).map((day) => (
                        <div key={day.date} className="flex items-center justify-between">
                          <span className="text-slate-300 text-sm">
                            {new Date(day.date).toLocaleDateString()}
                          </span>
                          <div className="flex items-center space-x-4">
                            <span className="text-white text-sm">
                              {formatCurrency(day.amount, 'GHS')}
                            </span>
                            <span className="text-slate-400 text-sm">
                              {day.count} transactions
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <LineChart className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">No trend data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Monthly Trends */}
              <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white">Monthly Performance</CardTitle>
                  <CardDescription className="text-slate-400">
                    Monthly transaction volume and count
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analyticsData?.trends?.monthly && analyticsData.trends.monthly.length > 0 ? (
                    <div className="space-y-3">
                      {analyticsData.trends.monthly.slice(-6).map((month) => (
                        <div key={month.month} className="flex items-center justify-between">
                          <span className="text-slate-300 text-sm">{month.month}</span>
                          <div className="flex items-center space-x-4">
                            <span className="text-white text-sm">
                              {formatCurrency(month.amount, 'GHS')}
                            </span>
                            <span className="text-slate-400 text-sm">
                              {month.count} transactions
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <TrendingUp className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">No monthly data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Breakdown Tab */}
          <TabsContent value="breakdown" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Employee Performance */}
              <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white">Employee Performance</CardTitle>
                  <CardDescription className="text-slate-400">
                    Top performing employees by transaction volume
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analyticsData?.breakdown?.byEmployee && analyticsData.breakdown.byEmployee.length > 0 ? (
                    <div className="space-y-4">
                      {analyticsData.breakdown.byEmployee.slice(0, 5).map((employee, index) => (
                        <div key={employee.employee} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              index === 0 ? 'bg-yellow-500 text-black' :
                              index === 1 ? 'bg-slate-400 text-black' :
                              index === 2 ? 'bg-amber-600 text-white' :
                              'bg-slate-600 text-white'
                            }`}>
                              {index + 1}
                            </div>
                            <span className="text-white">{employee.employee}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-white font-medium">
                              {formatCurrency(employee.amount, 'GHS')}
                            </div>
                            <div className="text-slate-400 text-sm">
                              {employee.count} transactions
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">No employee data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Category Breakdown */}
              <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white">Category Breakdown</CardTitle>
                  <CardDescription className="text-slate-400">
                    Transactions by category
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analyticsData?.breakdown?.byCategory && analyticsData.breakdown.byCategory.length > 0 ? (
                    <div className="space-y-4">
                      {analyticsData.breakdown.byCategory.map((category) => (
                        <div key={category.category} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="w-3 h-3 rounded-full bg-purple-500" />
                            <span className="text-white capitalize">{category.category}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-white font-medium">{category.count}</div>
                            <div className="text-slate-400 text-sm">
                              {formatCurrency(category.amount, 'GHS')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <PieChart className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">No category data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Performers */}
              <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white">Top Performers</CardTitle>
                  <CardDescription className="text-slate-400">
                    Employees with highest success rates
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analyticsData?.performance?.topPerformers && analyticsData.performance.topPerformers.length > 0 ? (
                    <div className="space-y-4">
                      {analyticsData.performance.topPerformers.slice(0, 5).map((performer, index) => (
                        <div key={performer.employee} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              index === 0 ? 'bg-yellow-500 text-black' :
                              index === 1 ? 'bg-slate-400 text-black' :
                              index === 2 ? 'bg-amber-600 text-white' :
                              'bg-slate-600 text-white'
                            }`}>
                              {index + 1}
                            </div>
                            <span className="text-white">{performer.employee}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-white font-medium">
                              {performer.successRate.toFixed(1)}%
                            </div>
                            <div className="text-slate-400 text-sm">
                              {performer.transactions} transactions
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Target className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">No performance data available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Risk Metrics */}
              <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white">Risk & Compliance</CardTitle>
                  <CardDescription className="text-slate-400">
                    Risk metrics and compliance indicators
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {analyticsData?.performance?.riskMetrics ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300">Failed Transactions</span>
                        <span className="text-red-400 font-medium">
                          {analyticsData.performance.riskMetrics.failedTransactions}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300">Pending Transactions</span>
                        <span className="text-yellow-400 font-medium">
                          {analyticsData.performance.riskMetrics.pendingTransactions}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300">Avg Processing Time</span>
                        <span className="text-blue-400 font-medium">
                          {analyticsData.performance.riskMetrics.averageProcessingTime.toFixed(1)}h
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300">Compliance Score</span>
                        <span className="text-emerald-400 font-medium">
                          {analyticsData.performance.riskMetrics.complianceScore.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <AlertCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">No risk metrics available</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MerchantLayout>
  )
}

export default withRouteProtection(CompanyAnalyticsPage, ['merchant', 'admin'])
