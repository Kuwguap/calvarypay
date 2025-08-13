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
} from "lucide-react"
import { EmployeeLayout } from "@/components/dashboard/role-based-layout"
import { withRouteProtection } from "@/lib/auth/route-protection"
import { useAuth } from "@/lib/hooks/use-auth"
import { formatCurrency, formatDate } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"

function EmployeeDashboard() {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)

  // Fetch company information
  const { data: companyData, isLoading: companyLoading } = useQuery({
    queryKey: ['employee-company-info'],
    queryFn: async () => {
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
    enabled: !!user?.accessToken,
    staleTime: 300000, // 5 minutes
  })

  // Fetch recent transactions
  const { data: transactionsData, isLoading: transactionsLoading } = useQuery({
    queryKey: ['recent-transactions'],
    queryFn: async () => {
      const response = await fetch('/api/payments/transactions?limit=5', {
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
    staleTime: 30000 // 30 seconds
  })

  const transactions = transactionsData?.transactions || []

  const filteredTransactions = transactions.filter((transaction: any) => {
    const matchesSearch = !searchTerm ||
      transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.reference?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === "all" || transaction.status === filterStatus
    return matchesSearch && matchesFilter
  })

  // Calculate stats from real data
  const stats = transactions.reduce((acc: any, transaction: any) => {
    acc.totalAmount += transaction.amount || 0
    acc.totalTransactions++

    if (transaction.status === 'pending') {
      acc.pendingTransactions++
      acc.pendingAmount += transaction.amount || 0
    } else if (transaction.status === 'success') {
      acc.successfulTransactions++
    }

    return acc
  }, {
    totalAmount: 0,
    totalTransactions: 0,
    pendingTransactions: 0,
    pendingAmount: 0,
    successfulTransactions: 0
  })

  stats.averageTransaction = stats.totalTransactions > 0 ? stats.totalAmount / stats.totalTransactions : 0

  return (
    <EmployeeLayout>
      <div className="space-y-8">
            {/* Welcome Section */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Welcome back, John!</h1>
                <p className="text-slate-400">Here's your payment activity overview</p>
              </div>
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
                      <Button className="flex-1 bg-blue-600 hover:bg-blue-700">Submit Request</Button>
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

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                  <CardTitle className="text-sm font-medium text-slate-400">Total Spent</CardTitle>
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
                  <CardTitle className="text-sm font-medium text-slate-400">Transactions</CardTitle>
                  <div className="p-2 bg-emerald-600/20 rounded-lg">
                    <CreditCard className="h-4 w-4 text-emerald-400" />
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
                  <CardTitle className="text-sm font-medium text-slate-400">Avg. Transaction</CardTitle>
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

            {/* Company Information */}
            {companyData && companyData.hasCompany && (
              <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
                <CardHeader className="pb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white text-lg font-semibold flex items-center">
                        <Building2 className="w-5 h-5 mr-2 text-blue-400" />
                        Company Information
                      </CardTitle>
                      <CardDescription className="text-slate-400 mt-1">
                        Your current company and team details
                      </CardDescription>
                    </div>
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                      Active Employee
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Company Details */}
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-800/50 rounded-lg">
                        <h4 className="text-white font-medium mb-3 flex items-center">
                          <Building2 className="w-4 h-4 mr-2 text-blue-400" />
                          Company Details
                        </h4>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Company:</span>
                            <span className="text-white font-medium">{companyData.company.name}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Email:</span>
                            <span className="text-white">{companyData.company.email}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Currency:</span>
                            <span className="text-white">{companyData.company.defaultCurrency}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Joined:</span>
                            <span className="text-white">{formatDate(companyData.employee.joinedAt)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Employee Details */}
                      <div className="p-4 bg-slate-800/50 rounded-lg">
                        <h4 className="text-white font-medium mb-3 flex items-center">
                          <Users className="w-4 h-4 mr-2 text-emerald-400" />
                          Your Position
                        </h4>
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Department:</span>
                            <Badge variant="outline" className="border-slate-600 text-slate-300">
                              {companyData.employee.department}
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Spending Limit:</span>
                            <span className="text-white font-medium">
                              {formatCurrency(companyData.employee.spendingLimit, companyData.company.defaultCurrency)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Team Members */}
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-800/50 rounded-lg">
                        <h4 className="text-white font-medium mb-3 flex items-center">
                          <Users className="w-4 h-4 mr-2 text-purple-400" />
                          Team Members ({companyData.stats.totalColleagues})
                        </h4>
                        {companyData.colleagues.length > 0 ? (
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {companyData.colleagues.slice(0, 5).map((colleague) => (
                              <div key={colleague.id} className="flex items-center justify-between p-2 bg-slate-700/50 rounded">
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center">
                                    <span className="text-purple-400 text-sm font-medium">
                                      {colleague.name.split(' ').map(n => n.charAt(0)).join('')}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="text-white text-sm font-medium">{colleague.name}</p>
                                    <p className="text-slate-400 text-xs">{colleague.department}</p>
                                  </div>
                                </div>
                                <div className="flex items-center">
                                  {colleague.isOnline ? (
                                    <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                                  ) : (
                                    <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
                                  )}
                                </div>
                              </div>
                            ))}
                            {companyData.colleagues.length > 5 && (
                              <p className="text-slate-400 text-sm text-center pt-2">
                                +{companyData.colleagues.length - 5} more colleagues
                              </p>
                            )}
                          </div>
                        ) : (
                          <p className="text-slate-400 text-sm">No other team members yet</p>
                        )}
                      </div>

                      {/* Company Stats */}
                      <div className="p-4 bg-slate-800/50 rounded-lg">
                        <h4 className="text-white font-medium mb-3">Team Stats</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center">
                            <div className="text-lg font-bold text-emerald-400">
                              {companyData.stats.onlineColleagues}
                            </div>
                            <div className="text-xs text-slate-400">Online Now</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-blue-400">
                              {companyData.stats.totalColleagues + 1}
                            </div>
                            <div className="text-xs text-slate-400">Total Members</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* No Company State */}
            {companyData && !companyData.hasCompany && (
              <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
                <CardContent className="p-8 text-center">
                  <Building2 className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">No Company Association</h3>
                  <p className="text-slate-400 mb-6">
                    You're not currently part of any company. Wait for an invitation from a company to join their team.
                  </p>
                  {companyData.pendingInvitations.length > 0 && (
                    <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4 mb-4">
                      <h4 className="text-blue-400 font-medium mb-2">Pending Invitations</h4>
                      <div className="space-y-2">
                        {companyData.pendingInvitations.map((invitation) => (
                          <div key={invitation.id} className="flex items-center justify-between p-2 bg-slate-800/50 rounded">
                            <div>
                              <p className="text-white text-sm font-medium">{invitation.companyName}</p>
                              <p className="text-slate-400 text-xs">{invitation.department}</p>
                            </div>
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                              View
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex justify-center space-x-4">
                    <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                      <Mail className="w-4 h-4 mr-2" />
                      Contact Support
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Transactions */}
            <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
              <CardHeader className="pb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white text-lg font-semibold">Recent Transactions</CardTitle>
                    <CardDescription className="text-slate-400 mt-1">Your latest payment activities</CardDescription>
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
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
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
                    <Link href="/dashboard/employee/transactions">
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View All
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </Link>
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
                        <TableHead className="text-slate-400 font-medium py-4">Currency</TableHead>
                        <TableHead className="text-slate-400 font-medium py-4">Amount</TableHead>
                        <TableHead className="text-slate-400 font-medium py-4">Status</TableHead>
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
                              <Skeleton className="h-6 w-20 bg-slate-700" />
                            </TableCell>
                            <TableCell className="py-4">
                              <Skeleton className="h-4 w-16 bg-slate-700" />
                            </TableCell>
                            <TableCell className="py-4">
                              <Skeleton className="h-6 w-20 bg-slate-700" />
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
                        filteredTransactions.map((transaction: any, index: number) => (
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
                            <TableCell className="py-4">
                              <Badge variant="outline" className="border-slate-600 text-slate-300 bg-slate-800/50">
                                {transaction.currency}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-white font-semibold py-4">
                              {formatCurrency(transaction.amount, transaction.currency)}
                            </TableCell>
                            <TableCell className="py-4">
                              <Badge
                                className={
                                  transaction.status === "success"
                                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                    : transaction.status === "pending"
                                    ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                    : "bg-red-500/20 text-red-400 border-red-500/30"
                                }
                              >
                                {transaction.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
      </div>
    </EmployeeLayout>
  )
}

// Export with route protection
export default withRouteProtection(EmployeeDashboard, ['employee'])
