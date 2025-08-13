"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
} from "lucide-react"
import Link from "next/link"

export default function CompanyDashboard() {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterStatus, setFilterStatus] = useState("all")
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false)

  // Mock data
  const pendingApprovals = [
    {
      id: "REQ001",
      employee: "John Doe",
      department: "Operations",
      description: "Fuel Purchase - Station A",
      amount: 450.0,
      date: "2024-01-15",
      category: "Fuel",
    },
    {
      id: "REQ002",
      employee: "Jane Smith",
      department: "Maintenance",
      description: "Vehicle Service",
      amount: 1200.5,
      date: "2024-01-14",
      category: "Maintenance",
    },
    {
      id: "REQ003",
      employee: "Mike Johnson",
      department: "Operations",
      description: "Office Supplies",
      amount: 125.0,
      date: "2024-01-13",
      category: "Supplies",
    },
  ]

  const employees = [
    {
      id: "EMP001",
      name: "John Doe",
      department: "Operations",
      totalSpent: 2450.0,
      transactions: 12,
      status: "active",
      lastActivity: "2024-01-15",
    },
    {
      id: "EMP002",
      name: "Jane Smith",
      department: "Maintenance",
      totalSpent: 3200.5,
      transactions: 8,
      status: "active",
      lastActivity: "2024-01-14",
    },
    {
      id: "EMP003",
      name: "Mike Johnson",
      department: "Operations",
      totalSpent: 1800.25,
      transactions: 15,
      status: "active",
      lastActivity: "2024-01-13",
    },
  ]

  const departmentData = [
    { name: "Operations", spent: 15420.0, budget: 20000.0, employees: 8 },
    { name: "Maintenance", spent: 12300.5, budget: 15000.0, employees: 5 },
    { name: "Administration", spent: 5600.25, budget: 8000.0, employees: 3 },
    { name: "Finance", spent: 3200.0, budget: 5000.0, employees: 2 },
  ]

  const handleApproval = (id: string, action: "approve" | "reject") => {
    console.log(`${action} request ${id}`)
  }

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
            <Badge className="bg-blue-100 text-blue-700 border-blue-200">Company</Badge>
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
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <span className="text-white text-sm font-medium">Metro Mass Transit</span>
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
              href="/dashboard/company"
              className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-white/20 text-white border border-white/30 backdrop-blur-sm"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="font-medium">Overview</span>
            </Link>
            <Link
              href="/dashboard/company/employees"
              className="flex items-center space-x-3 px-3 py-2 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Users className="w-4 h-4" />
              <span>Employees</span>
            </Link>
            <Link
              href="/dashboard/company/approvals"
              className="flex items-center space-x-3 px-3 py-2 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Clock className="w-4 h-4" />
              <span>Approvals</span>
            </Link>
            <Link
              href="/dashboard/company/departments"
              className="flex items-center space-x-3 px-3 py-2 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Building2 className="w-4 h-4" />
              <span>Departments</span>
            </Link>
            <Link
              href="/dashboard/company/reports"
              className="flex items-center space-x-3 px-3 py-2 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            >
              <TrendingUp className="w-4 h-4" />
              <span>Reports</span>
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Welcome Section */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white drop-shadow-sm">Company Dashboard</h1>
                <p className="text-white/80 mt-1">Monitor and manage your organization's payment activities</p>
              </div>
              <Dialog open={isEmployeeDialogOpen} onOpenChange={setIsEmployeeDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-lg">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Employee
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white border-0 shadow-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-slate-900">Add New Employee</DialogTitle>
                    <DialogDescription className="text-slate-600">
                      Add a new employee to your organization
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className="text-slate-700 font-medium">
                          First Name
                        </Label>
                        <Input
                          id="firstName"
                          placeholder="John"
                          className="bg-white border-slate-300 focus:border-violet-500 focus:ring-violet-500/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName" className="text-slate-700 font-medium">
                          Last Name
                        </Label>
                        <Input
                          id="lastName"
                          placeholder="Doe"
                          className="bg-white border-slate-300 focus:border-violet-500 focus:ring-violet-500/20"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-slate-700 font-medium">
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john.doe@company.com"
                        className="bg-white border-slate-300 focus:border-violet-500 focus:ring-violet-500/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="department" className="text-slate-700 font-medium">
                        Department
                      </Label>
                      <Select>
                        <SelectTrigger className="bg-white border-slate-300 focus:border-violet-500 focus:ring-violet-500/20">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200">
                          <SelectItem value="operations">Operations</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="administration">Administration</SelectItem>
                          <SelectItem value="finance">Finance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="spendingLimit" className="text-slate-700 font-medium">
                        Monthly Spending Limit (₵)
                      </Label>
                      <Input
                        id="spendingLimit"
                        type="number"
                        placeholder="5000.00"
                        className="bg-white border-slate-300 focus:border-violet-500 focus:ring-violet-500/20"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-medium">
                        Add Employee
                      </Button>
                      <Button
                        variant="outline"
                        className="border-slate-300 text-slate-700 hover:bg-slate-50 bg-transparent"
                        onClick={() => setIsEmployeeDialogOpen(false)}
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
                  <CardTitle className="text-sm font-medium text-slate-600">Total Company Spending</CardTitle>
                  <DollarSign className="h-4 w-4 text-slate-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">₵36,520.75</div>
                  <p className="text-xs text-green-600 font-medium">+8% from last month</p>
                </CardContent>
              </Card>

              <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Active Employees</CardTitle>
                  <Users className="h-4 w-4 text-slate-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">18</div>
                  <p className="text-xs text-green-600 font-medium">+2 new this month</p>
                </CardContent>
              </Card>

              <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Pending Approvals</CardTitle>
                  <Clock className="h-4 w-4 text-slate-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">3</div>
                  <p className="text-xs text-amber-600 font-medium">₵1,775.50 awaiting approval</p>
                </CardContent>
              </Card>

              <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Budget Utilization</CardTitle>
                  <TrendingUp className="h-4 w-4 text-slate-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">76%</div>
                  <p className="text-xs text-blue-600 font-medium">₵12,479.25 remaining</p>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="approvals" className="space-y-6">
              <TabsList className="bg-white/95 backdrop-blur-sm border-0 shadow-lg">
                <TabsTrigger
                  value="approvals"
                  className="data-[state=active]:bg-slate-900 data-[state=active]:text-white"
                >
                  Pending Approvals
                </TabsTrigger>
                <TabsTrigger
                  value="employees"
                  className="data-[state=active]:bg-slate-900 data-[state=active]:text-white"
                >
                  Employee Overview
                </TabsTrigger>
                <TabsTrigger
                  value="departments"
                  className="data-[state=active]:bg-slate-900 data-[state=active]:text-white"
                >
                  Department Analytics
                </TabsTrigger>
              </TabsList>

              <TabsContent value="approvals">
                <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-lg">
                  <CardHeader>
                    <CardTitle className="text-slate-900">Payment Approvals</CardTitle>
                    <CardDescription className="text-slate-600">
                      Review and approve employee payment requests
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-200">
                          <TableHead className="text-slate-600 font-medium">Request ID</TableHead>
                          <TableHead className="text-slate-600 font-medium">Employee</TableHead>
                          <TableHead className="text-slate-600 font-medium">Department</TableHead>
                          <TableHead className="text-slate-600 font-medium">Description</TableHead>
                          <TableHead className="text-slate-600 font-medium">Amount</TableHead>
                          <TableHead className="text-slate-600 font-medium">Date</TableHead>
                          <TableHead className="text-slate-600 font-medium">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingApprovals.map((request) => (
                          <TableRow key={request.id} className="border-slate-200">
                            <TableCell className="text-slate-600 font-mono text-sm">{request.id}</TableCell>
                            <TableCell className="text-slate-900 font-medium">{request.employee}</TableCell>
                            <TableCell className="text-slate-600">{request.department}</TableCell>
                            <TableCell className="text-slate-900 font-medium">{request.description}</TableCell>
                            <TableCell className="text-slate-900 font-semibold">₵{request.amount.toFixed(2)}</TableCell>
                            <TableCell className="text-slate-600">{request.date}</TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  onClick={() => handleApproval(request.id, "approve")}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  className="bg-red-600 hover:bg-red-700 text-white"
                                  onClick={() => handleApproval(request.id, "reject")}
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="employees">
                <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-lg">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-slate-900">Employee Management</CardTitle>
                        <CardDescription className="text-slate-600">
                          Monitor employee spending and activity
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                          <Input
                            placeholder="Search employees..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-white border-slate-300 focus:border-violet-500 focus:ring-violet-500/20 w-64"
                          />
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-200">
                          <TableHead className="text-slate-600 font-medium">Employee</TableHead>
                          <TableHead className="text-slate-600 font-medium">Department</TableHead>
                          <TableHead className="text-slate-600 font-medium">Total Spent</TableHead>
                          <TableHead className="text-slate-600 font-medium">Transactions</TableHead>
                          <TableHead className="text-slate-600 font-medium">Last Activity</TableHead>
                          <TableHead className="text-slate-600 font-medium">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employees.map((employee) => (
                          <TableRow key={employee.id} className="border-slate-200">
                            <TableCell className="text-slate-900 font-medium">{employee.name}</TableCell>
                            <TableCell className="text-slate-600">{employee.department}</TableCell>
                            <TableCell className="text-slate-900 font-semibold">
                              ₵{employee.totalSpent.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-slate-600">{employee.transactions}</TableCell>
                            <TableCell className="text-slate-600">{employee.lastActivity}</TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-700 border-green-200">{employee.status}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="departments">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {departmentData.map((dept) => (
                    <Card key={dept.name} className="bg-white/95 backdrop-blur-sm border-0 shadow-lg">
                      <CardHeader>
                        <CardTitle className="text-slate-900 flex items-center justify-between">
                          {dept.name}
                          <Badge
                            className={
                              dept.spent / dept.budget > 0.8
                                ? "bg-red-100 text-red-700 border-red-200"
                                : dept.spent / dept.budget > 0.6
                                  ? "bg-amber-100 text-amber-700 border-amber-200"
                                  : "bg-green-100 text-green-700 border-green-200"
                            }
                          >
                            {Math.round((dept.spent / dept.budget) * 100)}% Used
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600">Budget:</span>
                          <span className="text-slate-900 font-semibold">₵{dept.budget.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600">Spent:</span>
                          <span className="text-slate-900 font-semibold">₵{dept.spent.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600">Remaining:</span>
                          <span className="text-slate-900 font-semibold">₵{(dept.budget - dept.spent).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-600">Employees:</span>
                          <span className="text-slate-900 font-semibold">{dept.employees}</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              dept.spent / dept.budget > 0.8
                                ? "bg-red-500"
                                : dept.spent / dept.budget > 0.6
                                  ? "bg-amber-500"
                                  : "bg-green-500"
                            }`}
                            style={{ width: `${Math.min((dept.spent / dept.budget) * 100, 100)}%` }}
                          ></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
}
