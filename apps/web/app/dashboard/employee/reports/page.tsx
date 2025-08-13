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
  Calendar,
  Download,
  FileText,
  TrendingUp,
  DollarSign,
  Clock,
  ArrowLeft,
  BarChart3,
  PieChart,
  RefreshCw,
  Filter,
  Search,
  AlertCircle
} from "lucide-react"
import { EmployeeLayout } from "@/components/dashboard/role-based-layout"
import { withRouteProtection } from "@/lib/auth/route-protection"
import { useAuth } from "@/lib/hooks/use-auth"
import { formatCurrency, formatDate } from "@/lib/utils"
import Link from "next/link"

// Types
interface ReportData {
  summary: {
    totalTransactions: number
    totalAmount: number
    successfulTransactions: number
    failedTransactions: number
    pendingTransactions: number
    averageTransactionAmount: number
  }
  categoryBreakdown: Array<{
    category: string
    count: number
    amount: number
    percentage: number
  }>
  monthlyTrends: Array<{
    month: string
    transactions: number
    amount: number
  }>
  recentTransactions: Array<{
    id: string
    reference: string
    amount: number
    currency: string
    status: string
    description: string
    createdAt: string
    category?: string
  }>
}

function ReportsPage() {
  const { user } = useAuth()
  
  // State
  const [dateRange, setDateRange] = useState("30") // days
  const [reportType, setReportType] = useState("summary")
  const [isExporting, setIsExporting] = useState(false)

  // Fetch report data
  const {
    data: reportData,
    isLoading: reportLoading,
    error: reportError,
    refetch: refetchReport
  } = useQuery({
    queryKey: ['employee-reports', dateRange, reportType],
    queryFn: async (): Promise<ReportData> => {
      const params = new URLSearchParams({
        days: dateRange,
        type: reportType
      })

      const response = await fetch(`/api/reports/employee?${params}`, {
        headers: {
          'Authorization': `Bearer ${user?.accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch report data')
      }

      return response.json()
    },
    enabled: !!user?.accessToken,
    staleTime: 300000, // 5 minutes
  })

  // Export report
  const handleExportReport = async (format: 'csv' | 'pdf') => {
    setIsExporting(true)
    try {
      const params = new URLSearchParams({
        days: dateRange,
        type: reportType,
        format
      })

      const response = await fetch(`/api/reports/employee/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${user?.accessToken}`,
        }
      })

      if (!response.ok) {
        throw new Error('Failed to export report')
      }

      // Download the file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `employee-report-${dateRange}days.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'success':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'failed':
      case 'error':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
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
              <h1 className="text-3xl font-bold text-white mb-2">Reports & Analytics</h1>
              <p className="text-slate-400">View your transaction reports and analytics</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchReport()}
              disabled={reportLoading}
              className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${reportLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white text-lg font-semibold flex items-center">
              <Filter className="w-5 h-5 mr-2 text-blue-400" />
              Report Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <div className="space-y-2">
                <Label htmlFor="reportType" className="text-slate-300">Report Type</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="summary">Summary Report</SelectItem>
                    <SelectItem value="detailed">Detailed Report</SelectItem>
                    <SelectItem value="category">Category Analysis</SelectItem>
                    <SelectItem value="trends">Trend Analysis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Export</Label>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportReport('csv')}
                    disabled={isExporting || reportLoading}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    CSV
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportReport('pdf')}
                    disabled={isExporting || reportLoading}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    PDF
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {reportError && (
          <Alert className="bg-red-500/20 border-red-500/30">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-400">
              Failed to load report data. Please try again.
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {reportLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="bg-slate-900/50 border-slate-800">
                <CardContent className="p-6">
                  <Skeleton className="h-4 w-24 mb-2 bg-slate-700" />
                  <Skeleton className="h-8 w-32 bg-slate-700" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Report Content */}
        {reportData && !reportLoading && (
          <div className="space-y-8">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-sm font-medium">Total Transactions</p>
                      <p className="text-2xl font-bold text-white">{reportData.summary.totalTransactions}</p>
                    </div>
                    <div className="p-3 bg-blue-500/20 rounded-lg">
                      <FileText className="w-6 h-6 text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-sm font-medium">Total Amount</p>
                      <p className="text-2xl font-bold text-white">
                        {formatCurrency(reportData.summary.totalAmount)}
                      </p>
                    </div>
                    <div className="p-3 bg-emerald-500/20 rounded-lg">
                      <DollarSign className="w-6 h-6 text-emerald-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-sm font-medium">Success Rate</p>
                      <p className="text-2xl font-bold text-white">
                        {reportData.summary.totalTransactions > 0 
                          ? Math.round((reportData.summary.successfulTransactions / reportData.summary.totalTransactions) * 100)
                          : 0}%
                      </p>
                    </div>
                    <div className="p-3 bg-emerald-500/20 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-emerald-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-400 text-sm font-medium">Average Amount</p>
                      <p className="text-2xl font-bold text-white">
                        {formatCurrency(reportData.summary.averageTransactionAmount)}
                      </p>
                    </div>
                    <div className="p-3 bg-purple-500/20 rounded-lg">
                      <BarChart3 className="w-6 h-6 text-purple-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Category Breakdown */}
            {reportData.categoryBreakdown && reportData.categoryBreakdown.length > 0 && (
              <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white text-xl font-semibold flex items-center">
                    <PieChart className="w-5 h-5 mr-2 text-purple-400" />
                    Category Breakdown
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Transaction distribution by category
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reportData.categoryBreakdown.map((category, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-3 h-3 rounded-full bg-blue-400" style={{
                            backgroundColor: `hsl(${(index * 60) % 360}, 70%, 50%)`
                          }} />
                          <div>
                            <p className="text-white font-medium capitalize">{category.category}</p>
                            <p className="text-slate-400 text-sm">{category.count} transactions</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-semibold">{formatCurrency(category.amount)}</p>
                          <p className="text-slate-400 text-sm">{category.percentage.toFixed(1)}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Transactions */}
            {reportData.recentTransactions && reportData.recentTransactions.length > 0 && (
              <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white text-xl font-semibold flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-blue-400" />
                    Recent Transactions
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Latest transactions in the selected period
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-700">
                          <TableHead className="text-slate-300">Reference</TableHead>
                          <TableHead className="text-slate-300">Amount</TableHead>
                          <TableHead className="text-slate-300">Status</TableHead>
                          <TableHead className="text-slate-300">Description</TableHead>
                          <TableHead className="text-slate-300">Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.recentTransactions.map((transaction) => (
                          <TableRow key={transaction.id} className="border-slate-700">
                            <TableCell className="text-white font-mono text-sm">
                              {transaction.reference}
                            </TableCell>
                            <TableCell className="text-white font-semibold">
                              {formatCurrency(transaction.amount, transaction.currency)}
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(transaction.status)}>
                                {transaction.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-slate-300 max-w-xs truncate">
                              {transaction.description}
                            </TableCell>
                            <TableCell className="text-slate-400">
                              {formatDate(transaction.createdAt)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* No Data State */}
            {reportData.summary.totalTransactions === 0 && (
              <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
                <CardContent className="p-12 text-center">
                  <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Data Available</h3>
                  <p className="text-slate-400 mb-6">
                    No transactions found for the selected period. Try adjusting your filters or make some transactions.
                  </p>
                  <Link href="/dashboard/employee/quick-pay">
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                      <DollarSign className="w-4 h-4 mr-2" />
                      Make a Payment
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </EmployeeLayout>
  )
}

export default withRouteProtection(ReportsPage, ['employee'])
