"use client"

import { useState } from "react"
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
  User,
  Bell,
  Settings,
  LogOut,
} from "lucide-react"
import Link from "next/link"

export default function EmployeeDashboard() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)

  // Mock data
  const transactions = [
    {
      id: "TXN001",
      date: "2024-01-15",
      description: "Fuel Purchase - Station A",
      amount: 450.0,
      status: "completed",
      category: "Fuel",
    },
    {
      id: "TXN002",
      date: "2024-01-14",
      description: "Maintenance - Vehicle Service",
      amount: 1200.5,
      status: "pending",
      category: "Maintenance",
    },
    {
      id: "TXN003",
      date: "2024-01-13",
      description: "Fuel Purchase - Station B",
      amount: 380.75,
      status: "completed",
      category: "Fuel",
    },
    {
      id: "TXN004",
      date: "2024-01-12",
      description: "Office Supplies",
      amount: 125.0,
      status: "completed",
      category: "Supplies",
    },
  ]

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === "all" || transaction.status === filterStatus
    return matchesSearch && matchesFilter
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 via-fuchsia-500 via-pink-400 to-amber-300">
      {/* Header */}
      <header className="border-b border-white/20 bg-white/10 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center border border-white/30">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white drop-shadow-sm">CalvaryPay</span>
            </div>
            <Badge className="bg-green-100 text-green-700 border-green-200">Employee</Badge>
          </div>

          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10">
              <Bell className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10">
              <Settings className="w-4 h-4" />
            </Button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center border border-white/30">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="text-white text-sm font-medium">John Doe</span>
            </div>
            <Link href="/auth/signin">
              <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10">
                <LogOut className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white/10 backdrop-blur-sm border-r border-white/20 min-h-screen">
          <nav className="p-4 space-y-2">
            <Link
              href="/dashboard/employee"
              className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-white/20 text-white border border-white/30 backdrop-blur-sm"
            >
              <TrendingUp className="w-4 h-4" />
              <span className="font-medium">Overview</span>
            </Link>
            <Link
              href="/dashboard/employee/transactions"
              className="flex items-center space-x-3 px-3 py-2 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            >
              <CreditCard className="w-4 h-4" />
              <span>Transactions</span>
            </Link>
            <Link
              href="/dashboard/employee/payments"
              className="flex items-center space-x-3 px-3 py-2 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            >
              <DollarSign className="w-4 h-4" />
              <span>Make Payment</span>
            </Link>
            <Link
              href="/dashboard/employee/profile"
              className="flex items-center space-x-3 px-3 py-2 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            >
              <User className="w-4 h-4" />
              <span>Profile</span>
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Welcome Section */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white drop-shadow-sm">Welcome back, John!</h1>
                <p className="text-white/80 mt-1">Here's your payment activity overview</p>
              </div>
              <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-lg">
                    <Plus className="w-4 h-4 mr-2" />
                    New Payment
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white border-0 shadow-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-slate-900">Make New Payment</DialogTitle>
                    <DialogDescription className="text-slate-600">
                      Submit a new payment request for approval
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="category" className="text-slate-700 font-medium">
                        Category
                      </Label>
                      <Select>
                        <SelectTrigger className="bg-white border-slate-300 focus:border-violet-500 focus:ring-violet-500/20">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200">
                          <SelectItem value="fuel">Fuel</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="supplies">Supplies</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="amount" className="text-slate-700 font-medium">
                        Amount (₵)
                      </Label>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="0.00"
                        className="bg-white border-slate-300 focus:border-violet-500 focus:ring-violet-500/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-slate-700 font-medium">
                        Description
                      </Label>
                      <Input
                        id="description"
                        placeholder="Payment description"
                        className="bg-white border-slate-300 focus:border-violet-500 focus:ring-violet-500/20"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-medium">
                        Submit Request
                      </Button>
                      <Button
                        variant="outline"
                        className="border-slate-300 text-slate-700 hover:bg-slate-50 bg-transparent"
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
              <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Total Spent</CardTitle>
                  <DollarSign className="h-4 w-4 text-slate-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">₵2,156.25</div>
                  <p className="text-xs text-green-600 font-medium">+12% from last month</p>
                </CardContent>
              </Card>

              <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Transactions</CardTitle>
                  <CreditCard className="h-4 w-4 text-slate-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">24</div>
                  <p className="text-xs text-green-600 font-medium">+3 from last week</p>
                </CardContent>
              </Card>

              <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Pending</CardTitle>
                  <Clock className="h-4 w-4 text-slate-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">1</div>
                  <p className="text-xs text-amber-600 font-medium">₵1,200.50 pending</p>
                </CardContent>
              </Card>

              <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Avg. Transaction</CardTitle>
                  <TrendingUp className="h-4 w-4 text-slate-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">₵289.81</div>
                  <p className="text-xs text-red-600 font-medium">-5% from last month</p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Transactions */}
            <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-slate-900">Recent Transactions</CardTitle>
                    <CardDescription className="text-slate-600">Your latest payment activities</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <Input
                        placeholder="Search transactions..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-white border-slate-300 focus:border-violet-500 focus:ring-violet-500/20 w-64"
                      />
                    </div>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-32 bg-white border-slate-300 focus:border-violet-500 focus:ring-violet-500/20">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-300 text-slate-700 hover:bg-slate-50 bg-transparent"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-200">
                      <TableHead className="text-slate-600 font-medium">Transaction ID</TableHead>
                      <TableHead className="text-slate-600 font-medium">Date</TableHead>
                      <TableHead className="text-slate-600 font-medium">Description</TableHead>
                      <TableHead className="text-slate-600 font-medium">Category</TableHead>
                      <TableHead className="text-slate-600 font-medium">Amount</TableHead>
                      <TableHead className="text-slate-600 font-medium">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction) => (
                      <TableRow key={transaction.id} className="border-slate-200">
                        <TableCell className="text-slate-600 font-mono text-sm">{transaction.id}</TableCell>
                        <TableCell className="text-slate-600">{transaction.date}</TableCell>
                        <TableCell className="text-slate-900 font-medium">{transaction.description}</TableCell>
                        <TableCell className="text-slate-600">
                          <Badge variant="outline" className="border-slate-300 text-slate-600 bg-slate-50">
                            {transaction.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-900 font-semibold">₵{transaction.amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              transaction.status === "completed"
                                ? "bg-green-100 text-green-700 border-green-200"
                                : "bg-amber-100 text-amber-700 border-amber-200"
                            }
                          >
                            {transaction.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}
