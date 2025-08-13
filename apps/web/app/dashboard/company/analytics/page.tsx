"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Activity,
  PieChart,
  Calendar,
  Download,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Target,
  Zap,
  Clock,
  Award
} from "lucide-react"
import { MerchantLayout } from "@/components/dashboard/role-based-layout"
import { withRouteProtection } from "@/lib/auth/route-protection"
import { useAuth } from "@/lib/hooks/use-auth"
import { formatCurrency, formatDate } from "@/lib/utils"
import Link from "next/link"

// Types
interface AnalyticsData {
  overview: {
    totalRevenue: number
    totalTransactions: number
    averageTransactionValue: number
    activeEmployees: number
    growthRate: number
    conversionRate: number
  }
  trends: {
    daily: Array<{ date: string; revenue: number; transactions: number }>
    weekly: Array<{ week: string; revenue: number; transactions: number }>
    monthly: Array<{ month: string; revenue: number; transactions: number }>
  }
  categories: Array<{
    category: string
    amount: number
    count: number
    percentage: number
    growth: number
  }>
  employees: Array<{
    id: string
    name: string
    department: string
    totalSpent: number
    transactionCount: number
    efficiency: number
    lastActive: string
  }>
  departments: Array<{
    name: string
    budget: number
    spent: number
    employees: number
    efficiency: number
    topCategories: Array<{ category: string; amount: number }>
  }>
  insights: Array<{
    type: 'positive' | 'negative' | 'neutral'
    title: string
    description: string
    value?: string
    trend?: number
  }>
}

function AnalyticsPage() {
  const { user } = useAuth()
  
  // State
  const [timeRange, setTimeRange] = useState("30") // days
  const [viewType, setViewType] = useState("overview")

  // Fetch analytics data
  const {
    data: analyticsData,
    isLoading: analyticsLoading,
    error: analyticsError,
    refetch: refetchAnalytics
  } = useQuery({
    queryKey: ['merchant-analytics', timeRange, viewType],
    queryFn: async (): Promise<AnalyticsData> => {
      const params = new URLSearchParams({
        days: timeRange,
        view: viewType
      })

      const response = await fetch(`/api/merchant/analytics?${params}`, {
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

  // Export analytics
  const handleExportAnalytics = async (format: 'csv' | 'pdf') => {
    try {
      const params = new URLSearchParams({
        days: timeRange,
        view: viewType,
        format
      })

      const response = await fetch(`/api/merchant/analytics/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${user?.accessToken}`,
        }
      })

      if (!response.ok) {
        throw new Error('Failed to export analytics')
      }

      // Download the file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `merchant-analytics-${timeRange}days.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  // Get trend icon and color
  const getTrendDisplay = (trend: number) => {
    if (trend > 0) {
      return {
        icon: TrendingUp,
        color: "text-emerald-400",
        text: `+${trend.toFixed(1)}%`
      }
    } else if (trend < 0) {
      return {
        icon: TrendingDown,
        color: "text-red-400",
        text: `${trend.toFixed(1)}%`
      }
    } else {
      return {
        icon: Activity,
        color: "text-slate-400",
        text: "0%"
      }
    }
  }

  // Get insight color
  const getInsightColor = (type: string) => {
    switch (type) {
      case 'positive':
        return 'border-emerald-500/30 bg-emerald-500/10'
      case 'negative':
        return 'border-red-500/30 bg-red-500/10'
      default:
        return 'border-blue-500/30 bg-blue-500/10'
    }
  }

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
              <h1 className="text-3xl font-bold text-white mb-2">Advanced Analytics</h1>
              <p className="text-slate-400">Deep insights into your business performance</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportAnalytics('csv')}
              className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExportAnalytics('pdf')}
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
              <BarChart3 className="w-5 h-5 mr-2 text-blue-400" />
              Analytics Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-slate-300 text-sm font-medium">Time Range</label>
                <Select value={timeRange} onValueChange={setTimeRange}>
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
              
              <div className="space-y-2">
                <label className="text-slate-300 text-sm font-medium">View Type</label>
                <Select value={viewType} onValueChange={setViewType}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="overview">Overview</SelectItem>
                    <SelectItem value="detailed">Detailed Analysis</SelectItem>
                    <SelectItem value="trends">Trend Analysis</SelectItem>
                    <SelectItem value="performance">Performance Metrics</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {analyticsError && (
          <Alert className="bg-red-500/20 border-red-500/30">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-400">
              Failed to load analytics data. Please try again.
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {analyticsLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-24 mb-2 bg-slate-700" />
                  <Skeleton className="h-8 w-32 mb-4 bg-slate-700" />
                  <Skeleton className="h-4 w-20 bg-slate-700" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Analytics Content */}
        {analyticsData && !analyticsLoading && (
          <div className="space-y-8">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Revenue */}
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
                    {(() => {
                      const trend = getTrendDisplay(analyticsData.overview.growthRate)
                      const TrendIcon = trend.icon
                      return (
                        <>
                          <TrendIcon className={`w-4 h-4 mr-1 ${trend.color}`} />
                          <span className={`text-sm font-medium ${trend.color}`}>
                            {trend.text}
                          </span>
                          <span className="text-slate-400 text-sm ml-1">vs last period</span>
                        </>
                      )
                    })()}
                  </div>
                </CardContent>
              </Card>

              {/* Total Transactions */}
              <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-sm font-medium">Total Transactions</p>
                      <p className="text-2xl font-bold text-white">
                        {analyticsData.overview.totalTransactions.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-500/20 rounded-lg">
                      <Activity className="w-6 h-6 text-blue-400" />
                    </div>
                  </div>
                  <div className="flex items-center mt-4">
                    <Target className="w-4 h-4 mr-1 text-purple-400" />
                    <span className="text-purple-400 text-sm font-medium">
                      {analyticsData.overview.conversionRate.toFixed(1)}%
                    </span>
                    <span className="text-slate-400 text-sm ml-1">conversion rate</span>
                  </div>
                </CardContent>
              </Card>

              {/* Average Transaction Value */}
              <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-sm font-medium">Avg Transaction</p>
                      <p className="text-2xl font-bold text-white">
                        {formatCurrency(analyticsData.overview.averageTransactionValue, 'GHS')}
                      </p>
                    </div>
                    <div className="p-3 bg-yellow-500/20 rounded-lg">
                      <Zap className="w-6 h-6 text-yellow-400" />
                    </div>
                  </div>
                  <div className="flex items-center mt-4">
                    <Award className="w-4 h-4 mr-1 text-yellow-400" />
                    <span className="text-yellow-400 text-sm font-medium">
                      Optimized
                    </span>
                    <span className="text-slate-400 text-sm ml-1">performance</span>
                  </div>
                </CardContent>
              </Card>

              {/* Active Employees */}
              <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-sm font-medium">Active Employees</p>
                      <p className="text-2xl font-bold text-white">
                        {analyticsData.overview.activeEmployees}
                      </p>
                    </div>
                    <div className="p-3 bg-purple-500/20 rounded-lg">
                      <Users className="w-6 h-6 text-purple-400" />
                    </div>
                  </div>
                  <div className="flex items-center mt-4">
                    <Clock className="w-4 h-4 mr-1 text-emerald-400" />
                    <span className="text-emerald-400 text-sm font-medium">
                      All active
                    </span>
                    <span className="text-slate-400 text-sm ml-1">this period</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Category Analysis */}
            {analyticsData.categories && analyticsData.categories.length > 0 && (
              <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white text-xl font-semibold flex items-center">
                    <PieChart className="w-5 h-5 mr-2 text-purple-400" />
                    Spending by Category
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Breakdown of expenses by category with growth trends
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {analyticsData.categories.map((category, index) => (
                      <div key={category.category} className="p-4 bg-slate-800/50 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: `hsl(${(index * 60) % 360}, 70%, 50%)` }}
                            />
                            <h4 className="text-white font-medium capitalize">{category.category}</h4>
                          </div>
                          {(() => {
                            const trend = getTrendDisplay(category.growth)
                            const TrendIcon = trend.icon
                            return (
                              <div className="flex items-center">
                                <TrendIcon className={`w-4 h-4 ${trend.color}`} />
                                <span className={`text-xs ${trend.color} ml-1`}>
                                  {trend.text}
                                </span>
                              </div>
                            )
                          })()}
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-sm">Amount</span>
                            <span className="text-white font-semibold">
                              {formatCurrency(category.amount, 'GHS')}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-sm">Transactions</span>
                            <span className="text-white">{category.count}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-sm">Share</span>
                            <span className="text-white">{category.percentage.toFixed(1)}%</span>
                          </div>
                        </div>
                        <div className="mt-3 w-full bg-slate-700 rounded-full h-2">
                          <div
                            className="h-2 rounded-full"
                            style={{ 
                              width: `${category.percentage}%`,
                              backgroundColor: `hsl(${(index * 60) % 360}, 70%, 50%)`
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Employee Performance */}
            {analyticsData.employees && analyticsData.employees.length > 0 && (
              <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white text-xl font-semibold flex items-center">
                    <Users className="w-5 h-5 mr-2 text-blue-400" />
                    Employee Performance
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Top performing employees by spending efficiency
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analyticsData.employees.slice(0, 5).map((employee, index) => (
                      <div key={employee.id} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center justify-center w-8 h-8 bg-blue-500/20 rounded-full">
                            <span className="text-blue-400 font-semibold text-sm">#{index + 1}</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                              <span className="text-purple-400 font-semibold">
                                {employee.name.split(' ').map(n => n.charAt(0)).join('')}
                              </span>
                            </div>
                            <div>
                              <p className="text-white font-medium">{employee.name}</p>
                              <p className="text-slate-400 text-sm">{employee.department}</p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-semibold">
                            {formatCurrency(employee.totalSpent, 'GHS')}
                          </p>
                          <p className="text-slate-400 text-sm">
                            {employee.transactionCount} transactions
                          </p>
                          <div className="flex items-center justify-end mt-1">
                            <div className="w-16 bg-slate-700 rounded-full h-2 mr-2">
                              <div
                                className="h-2 rounded-full bg-emerald-500"
                                style={{ width: `${employee.efficiency}%` }}
                              />
                            </div>
                            <span className="text-emerald-400 text-xs font-medium">
                              {employee.efficiency}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Insights */}
            {analyticsData.insights && analyticsData.insights.length > 0 && (
              <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white text-xl font-semibold flex items-center">
                    <Zap className="w-5 h-5 mr-2 text-yellow-400" />
                    AI-Powered Insights
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Intelligent recommendations based on your data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analyticsData.insights.map((insight, index) => (
                      <div key={index} className={`p-4 rounded-lg border ${getInsightColor(insight.type)}`}>
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="text-white font-medium">{insight.title}</h4>
                          {insight.value && (
                            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                              {insight.value}
                            </Badge>
                          )}
                        </div>
                        <p className="text-slate-300 text-sm">{insight.description}</p>
                        {insight.trend !== undefined && (
                          <div className="flex items-center mt-2">
                            {(() => {
                              const trend = getTrendDisplay(insight.trend)
                              const TrendIcon = trend.icon
                              return (
                                <>
                                  <TrendIcon className={`w-4 h-4 mr-1 ${trend.color}`} />
                                  <span className={`text-sm ${trend.color}`}>
                                    {trend.text} trend
                                  </span>
                                </>
                              )
                            })()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* No Data State */}
            {analyticsData.overview.totalTransactions === 0 && (
              <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
                <CardContent className="p-12 text-center">
                  <BarChart3 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Analytics Data</h3>
                  <p className="text-slate-400 mb-6">
                    No transaction data available for the selected period. Start by inviting employees and processing transactions.
                  </p>
                  <div className="flex justify-center space-x-4">
                    <Link href="/dashboard/company/employees">
                      <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Users className="w-4 h-4 mr-2" />
                        Invite Employees
                      </Button>
                    </Link>
                    <Link href="/dashboard/company/transactions">
                      <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent">
                        <Activity className="w-4 h-4 mr-2" />
                        View Transactions
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </MerchantLayout>
  )
}

export default withRouteProtection(AnalyticsPage, ['merchant'])
