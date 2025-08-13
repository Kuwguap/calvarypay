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
  Wallet,
  Receipt,
} from "lucide-react"
import { CustomerLayout } from "@/components/dashboard/role-based-layout"
import { withRouteProtection } from "@/lib/auth/route-protection"

function CustomerDashboard() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)

  // Mock data for customer
  const transactions = [
    {
      id: "TXN001",
      date: "2024-01-15",
      description: "Online Purchase - Electronics",
      amount: 299.99,
      status: "completed",
      category: "Shopping",
    },
    {
      id: "TXN002",
      date: "2024-01-14",
      description: "Subscription Payment - Netflix",
      amount: 15.99,
      status: "completed",
      category: "Entertainment",
    },
    {
      id: "TXN003",
      date: "2024-01-13",
      description: "Grocery Store Payment",
      amount: 87.50,
      status: "completed",
      category: "Food",
    },
    {
      id: "TXN004",
      date: "2024-01-12",
      description: "Utility Bill Payment",
      amount: 125.00,
      status: "pending",
      category: "Bills",
    },
  ]

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterStatus === "all" || transaction.status === filterStatus
    return matchesSearch && matchesFilter
  })

  return (
    <CustomerLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Welcome back!</h1>
            <p className="text-slate-400">Manage your payments and transactions</p>
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
                  Send money or pay for services
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="recipient">Recipient</Label>
                  <Input
                    id="recipient"
                    placeholder="Enter recipient email or phone"
                    className="bg-slate-700 border-slate-600"
                  />
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
                  <Button className="flex-1 bg-blue-600 hover:bg-blue-700">Send Payment</Button>
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
              <CardTitle className="text-sm font-medium text-slate-400">Balance</CardTitle>
              <div className="p-2 bg-green-600/20 rounded-lg">
                <Wallet className="h-4 w-4 text-green-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white mb-1">₵1,234.56</div>
              <p className="text-xs text-emerald-400 flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" />
                +5.2% from last month
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
              <div className="text-2xl font-bold text-white mb-1">₵528.48</div>
              <p className="text-xs text-emerald-400 flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" />
                +12% from last month
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-medium text-slate-400">Transactions</CardTitle>
              <div className="p-2 bg-emerald-600/20 rounded-lg">
                <Receipt className="h-4 w-4 text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white mb-1">18</div>
              <p className="text-xs text-emerald-400 flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" />
                +3 from last week
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
              <div className="text-2xl font-bold text-white mb-1">1</div>
              <p className="text-xs text-slate-400">₵125.00 pending</p>
            </CardContent>
          </Card>
        </div>

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
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-hidden rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 bg-slate-800/30">
                    <TableHead className="text-slate-400 font-medium py-4 px-6">Transaction ID</TableHead>
                    <TableHead className="text-slate-400 font-medium py-4">Date</TableHead>
                    <TableHead className="text-slate-400 font-medium py-4">Description</TableHead>
                    <TableHead className="text-slate-400 font-medium py-4">Category</TableHead>
                    <TableHead className="text-slate-400 font-medium py-4">Amount</TableHead>
                    <TableHead className="text-slate-400 font-medium py-4">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction, index) => (
                    <TableRow
                      key={transaction.id}
                      className={`border-slate-800 hover:bg-slate-800/30 transition-colors ${
                        index % 2 === 0 ? 'bg-slate-900/20' : 'bg-transparent'
                      }`}
                    >
                      <TableCell className="text-slate-300 font-mono py-4 px-6">{transaction.id}</TableCell>
                      <TableCell className="text-slate-300 py-4">{transaction.date}</TableCell>
                      <TableCell className="text-white font-medium py-4">{transaction.description}</TableCell>
                      <TableCell className="py-4">
                        <Badge variant="outline" className="border-slate-600 text-slate-300 bg-slate-800/50">
                          {transaction.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-white font-semibold py-4">₵{transaction.amount.toFixed(2)}</TableCell>
                      <TableCell className="py-4">
                        <Badge
                          className={
                            transaction.status === "completed"
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                          }
                        >
                          {transaction.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </CustomerLayout>
  )
}

// Export with route protection
export default withRouteProtection(CustomerDashboard, ['customer'])
