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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">CalvaryPay</span>
            </div>
            <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30">Company</Badge>
          </div>

          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
              <Bell className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
              <Settings className="w-4 h-4" />
            </Button>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                <Building2 className="w-4 h-4 text-slate-300" />
              </div>
              <span className="text-slate-300 text-sm">Metro Mass Transit</span>
            </div>
            <Link href="/auth/signin">
              <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
                <LogOut className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-800/30 border-r border-slate-700/50 min-h-screen">
          <nav className="p-4 space-y-2">
            <Link
              href="/dashboard/company"
              className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-600/30"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Overview</span>
            </Link>
            <Link
              href="/dashboard/company/employees"
              className="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-700/50"
            >
              <Users className="w-4 h-4" />
              <span>Employees</span>
            </Link>
            <Link
              href="/dashboard/company/approvals"
              className="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-700/50"
            >
              <Clock className="w-4 h-4" />
              <span>Approvals</span>
            </Link>
            <Link
              href="/dashboard/company/departments"
              className="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-700/50"
            >
              <Building2 className="w-4 h-4" />
              <span>Departments</span>
            </Link>
            <Link
              href="/dashboard/company/reports"
              className="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-700/50"
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
                <h1 className="text-3xl font-bold text-white">Company Dashboard</h1>
                <p className="text-slate-300 mt-1">Monitor and manage your organization's payment activities</p>
              </div>
              <Dialog open={isEmployeeDialogOpen} onOpenChange={setIsEmployeeDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Employee
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-800 border-slate-700 text-white">
                  <DialogHeader>
                    <DialogTitle>Add New Employee</DialogTitle>
                    <DialogDescription className="text-slate-300">
                      Add a new employee to your organization
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input id="firstName" placeholder="John" className="bg-slate-700 border-slate-600" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input id="lastName" placeholder="Doe" className="bg-slate-700 border-slate-600" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john.doe@company.com"
                        className="bg-slate-700 border-slate-600"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      <Select>
                        <SelectTrigger className="bg-slate-700 border-slate-600">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700">
                          <SelectItem value="operations">Operations</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="administration">Administration</SelectItem>
                          <SelectItem value="finance">Finance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="spendingLimit">Monthly Spending Limit (₵)</Label>
                      <Input
                        id="spendingLimit"
                        type="number"
                        placeholder="5000.00"
                        className="bg-slate-700 border-slate-600"
                      />
                    </div>
                    <div className="flex space-x-2">
                      <Button className="flex-1 bg-blue-600 hover:bg-blue-700">Add Employee</Button>
                      <Button
                        variant="outline"
                        className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
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
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-300">Total Company Spending</CardTitle>
                  <DollarSign className="h-4 w-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">₵36,520.75</div>
                  <p className="text-xs text-slate-400">+8% from last month</p>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-300">Active Employees</CardTitle>
                  <Users className="h-4 w-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">18</div>
                  <p className="text-xs text-slate-400">+2 new this month</p>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-300">Pending Approvals</CardTitle>
                  <Clock className="h-4 w-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">3</div>
                  <p className="text-xs text-slate-400">₵1,775.50 awaiting approval</p>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-300">Budget Utilization</CardTitle>
                  <TrendingUp className="h-4 w-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">76%</div>
                  <p className="text-xs text-slate-400">₵12,479.25 remaining</p>
                </CardContent>
              </Card>
            </div>

            {/* Main Content Tabs */}
            <Tabs defaultValue="approvals" className="space-y-6">
              <TabsList className="bg-slate-800/50 border-slate-700">
                <TabsTrigger value="approvals" className="data-[state=active]:bg-blue-600">
                  Pending Approvals
                </TabsTrigger>
                <TabsTrigger value="employees" className="data-[state=active]:bg-blue-600">
                  Employee Overview
                </TabsTrigger>
                <TabsTrigger value="departments" className="data-[state=active]:bg-blue-600">
                  Department Analytics
                </TabsTrigger>
              </TabsList>

              <TabsContent value="approvals">
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Payment Approvals</CardTitle>
                    <CardDescription className="text-slate-300">
                      Review and approve employee payment requests
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-700">
                          <TableHead className="text-slate-300">Request ID</TableHead>
                          <TableHead className="text-slate-300">Employee</TableHead>
                          <TableHead className="text-slate-300">Department</TableHead>
                          <TableHead className="text-slate-300">Description</TableHead>
                          <TableHead className="text-slate-300">Amount</TableHead>
                          <TableHead className="text-slate-300">Date</TableHead>
                          <TableHead className="text-slate-300">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingApprovals.map((request) => (
                          <TableRow key={request.id} className="border-slate-700">
                            <TableCell className="text-slate-300 font-mono">{request.id}</TableCell>
                            <TableCell className="text-white">{request.employee}</TableCell>
                            <TableCell className="text-slate-300">{request.department}</TableCell>
                            <TableCell className="text-white">{request.description}</TableCell>
                            <TableCell className="text-white font-semibold">₵{request.amount.toFixed(2)}</TableCell>
                            <TableCell className="text-slate-300">{request.date}</TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => handleApproval(request.id, "approve")}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
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
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-white">Employee Management</CardTitle>
                        <CardDescription className="text-slate-300">
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
                            className="pl-10 bg-slate-700 border-slate-600 text-white w-64"
                          />
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-700">
                          <TableHead className="text-slate-300">Employee</TableHead>
                          <TableHead className="text-slate-300">Department</TableHead>
                          <TableHead className="text-slate-300">Total Spent</TableHead>
                          <TableHead className="text-slate-300">Transactions</TableHead>
                          <TableHead className="text-slate-300">Last Activity</TableHead>
                          <TableHead className="text-slate-300">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {employees.map((employee) => (
                          <TableRow key={employee.id} className="border-slate-700">
                            <TableCell className="text-white">{employee.name}</TableCell>
                            <TableCell className="text-slate-300">{employee.department}</TableCell>
                            <TableCell className="text-white font-semibold">
                              ₵{employee.totalSpent.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-slate-300">{employee.transactions}</TableCell>
                            <TableCell className="text-slate-300">{employee.lastActivity}</TableCell>
                            <TableCell>
                              <Badge className="bg-green-600/20 text-green-400 border-green-600/30">
                                {employee.status}
                              </Badge>
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
                    <Card key={dept.name} className="bg-slate-800/50 border-slate-700">
                      <CardHeader>
                        <CardTitle className="text-white flex items-center justify-between">
                          {dept.name}
                          <Badge
                            className={
                              dept.spent / dept.budget > 0.8
                                ? "bg-red-600/20 text-red-400 border-red-600/30"
                                : dept.spent / dept.budget > 0.6
                                  ? "bg-yellow-600/20 text-yellow-400 border-yellow-600/30"
                                  : "bg-green-600/20 text-green-400 border-green-600/30"
                            }
                          >
                            {Math.round((dept.spent / dept.budget) * 100)}% Used
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">Budget:</span>
                          <span className="text-white font-semibold">₵{dept.budget.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">Spent:</span>
                          <span className="text-white font-semibold">₵{dept.spent.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">Remaining:</span>
                          <span className="text-white font-semibold">₵{(dept.budget - dept.spent).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-300">Employees:</span>
                          <span className="text-white font-semibold">{dept.employees}</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              dept.spent / dept.budget > 0.8
                                ? "bg-red-500"
                                : dept.spent / dept.budget > 0.6
                                  ? "bg-yellow-500"
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
