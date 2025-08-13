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
import { Switch } from "@/components/ui/switch"
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
  Building2,
  Shield,
  Plus,
  Search,
  Bell,
  Settings,
  LogOut,
  CheckCircle,
  BarChart3,
  FileText,
  Globe,
  Sliders,
} from "lucide-react"
import Link from "next/link"

export default function AdminDashboard() {
  const [searchTerm, setSearchTerm] = useState("")
  const [isCompanyDialogOpen, setIsCompanyDialogOpen] = useState(false)
  const [isRateDialogOpen, setIsRateDialogOpen] = useState(false)

  // Mock data
  const companies = [
    {
      id: "COMP001",
      name: "Metro Mass Transit Ghana",
      type: "Transport",
      employees: 18,
      totalSpent: 36520.75,
      compliance: "compliant",
      lastActivity: "2024-01-15",
      taxCollected: 5478.11,
    },
    {
      id: "COMP002",
      name: "Ghana National Petroleum",
      type: "Energy",
      employees: 45,
      totalSpent: 125000.0,
      compliance: "compliant",
      lastActivity: "2024-01-14",
      taxCollected: 18750.0,
    },
    {
      id: "COMP003",
      name: "Accra Metropolitan Assembly",
      type: "Government",
      employees: 32,
      totalSpent: 78500.25,
      compliance: "warning",
      lastActivity: "2024-01-13",
      taxCollected: 11775.04,
    },
    {
      id: "COMP004",
      name: "Tema Port Authority",
      type: "Logistics",
      employees: 28,
      totalSpent: 65200.0,
      compliance: "compliant",
      lastActivity: "2024-01-12",
      taxCollected: 9780.0,
    },
  ]

  const systemRates = [
    { sector: "Transport", category: "Fuel", currentRate: 0.15, proposedRate: 0.18, status: "pending" },
    { sector: "Transport", category: "Maintenance", currentRate: 0.12, proposedRate: 0.12, status: "active" },
    { sector: "Energy", category: "Operations", currentRate: 0.2, proposedRate: 0.22, status: "pending" },
    { sector: "Government", category: "General", currentRate: 0.1, proposedRate: 0.1, status: "active" },
  ]

  const complianceIssues = [
    {
      id: "ISSUE001",
      company: "Accra Metropolitan Assembly",
      type: "Late Reporting",
      severity: "medium",
      description: "Monthly compliance report submitted 3 days late",
      date: "2024-01-10",
    },
    {
      id: "ISSUE002",
      company: "Metro Mass Transit Ghana",
      type: "Rate Deviation",
      severity: "low",
      description: "Minor deviation in fuel purchase rates",
      date: "2024-01-08",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 via-fuchsia-500 via-pink-400 to-amber-300">
      <header className="border-b border-white/20 bg-white/10 backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center border border-white/30">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white drop-shadow-sm">CalvaryPay</span>
            </div>
            <Badge className="bg-purple-100 text-purple-700 border-purple-200">Administrator</Badge>
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
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="text-white text-sm font-medium">System Admin</span>
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
        <aside className="w-64 bg-white/10 backdrop-blur-sm border-r border-white/20 min-h-screen">
          <nav className="p-4 space-y-2">
            <Link
              href="/dashboard/admin"
              className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-white/20 text-white border border-white/30 backdrop-blur-sm"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="font-medium">System Overview</span>
            </Link>
            <Link
              href="/dashboard/admin/companies"
              className="flex items-center space-x-3 px-3 py-2 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Building2 className="w-4 h-4" />
              <span>Companies</span>
            </Link>
            <Link
              href="/dashboard/admin/compliance"
              className="flex items-center space-x-3 px-3 py-2 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Shield className="w-4 h-4" />
              <span>Compliance</span>
            </Link>
            <Link
              href="/dashboard/admin/rates"
              className="flex items-center space-x-3 px-3 py-2 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Sliders className="w-4 h-4" />
              <span>Rate Management</span>
            </Link>
            <Link
              href="/dashboard/admin/reports"
              className="flex items-center space-x-3 px-3 py-2 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>Reports</span>
            </Link>
            <Link
              href="/dashboard/admin/settings"
              className="flex items-center space-x-3 px-3 py-2 rounded-lg text-white/80 hover:bg-white/10 hover:text-white transition-colors"
            >
              <Globe className="w-4 h-4" />
              <span>System Settings</span>
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white drop-shadow-sm">System Administration</h1>
                <p className="text-white/80 mt-1">Monitor and regulate payment activities across all organizations</p>
              </div>
              <div className="flex space-x-2">
                <Dialog open={isCompanyDialogOpen} onOpenChange={setIsCompanyDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-slate-900 hover:bg-slate-800 text-white font-medium shadow-lg">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Company
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white border-0 shadow-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-slate-900">Register New Company</DialogTitle>
                      <DialogDescription className="text-slate-600">
                        Add a new organization to the CalvaryPay system
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="companyName" className="text-slate-700 font-medium">
                          Company Name
                        </Label>
                        <Input
                          id="companyName"
                          placeholder="Metro Mass Transit Ghana"
                          className="bg-white border-slate-300 focus:border-violet-500 focus:ring-violet-500/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sector" className="text-slate-700 font-medium">
                          Sector
                        </Label>
                        <Select>
                          <SelectTrigger className="bg-white border-slate-300 focus:border-violet-500 focus:ring-violet-500/20">
                            <SelectValue placeholder="Select sector" />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-slate-200">
                            <SelectItem value="transport">Transport</SelectItem>
                            <SelectItem value="energy">Energy</SelectItem>
                            <SelectItem value="government">Government</SelectItem>
                            <SelectItem value="logistics">Logistics</SelectItem>
                            <SelectItem value="manufacturing">Manufacturing</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="adminEmail" className="text-slate-700 font-medium">
                          Admin Email
                        </Label>
                        <Input
                          id="adminEmail"
                          type="email"
                          placeholder="admin@company.com"
                          className="bg-white border-slate-300 focus:border-violet-500 focus:ring-violet-500/20"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="taxRate" className="text-slate-700 font-medium">
                          Tax Rate (%)
                        </Label>
                        <Input
                          id="taxRate"
                          type="number"
                          placeholder="15.0"
                          className="bg-white border-slate-300 focus:border-violet-500 focus:ring-violet-500/20"
                        />
                      </div>
                      <div className="flex space-x-2">
                        <Button className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-medium">
                          Register Company
                        </Button>
                        <Button
                          variant="outline"
                          className="border-slate-300 text-slate-700 hover:bg-slate-50 bg-transparent"
                          onClick={() => setIsCompanyDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={isRateDialogOpen} onOpenChange={setIsRateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-white/30 text-white hover:bg-white/10 bg-white/5 backdrop-blur-sm"
                    >
                      <Sliders className="w-4 h-4 mr-2" />
                      Update Rates
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-white border-0 shadow-2xl">
                    <DialogHeader>
                      <DialogTitle>Update System Rates</DialogTitle>
                      <DialogDescription className="text-slate-300">
                        Modify standardized charging rates across sectors
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="sector">Sector</Label>
                        <Select>
                          <SelectTrigger className="bg-slate-700 border-slate-600">
                            <SelectValue placeholder="Select sector" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            <SelectItem value="transport">Transport</SelectItem>
                            <SelectItem value="energy">Energy</SelectItem>
                            <SelectItem value="government">Government</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select>
                          <SelectTrigger className="bg-slate-700 border-slate-600">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            <SelectItem value="fuel">Fuel</SelectItem>
                            <SelectItem value="maintenance">Maintenance</SelectItem>
                            <SelectItem value="operations">Operations</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newRate">New Rate (%)</Label>
                        <Input
                          id="newRate"
                          type="number"
                          placeholder="18.0"
                          className="bg-slate-700 border-slate-600"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="effectiveDate">Effective Date</Label>
                        <Input id="effectiveDate" type="date" className="bg-slate-700 border-slate-600" />
                      </div>
                      <div className="flex space-x-2">
                        <Button className="flex-1 bg-blue-600 hover:bg-blue-700">Update Rate</Button>
                        <Button
                          variant="outline"
                          className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                          onClick={() => setIsRateDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Total System Volume</CardTitle>
                  <DollarSign className="h-4 w-4 text-slate-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">₵305,221.00</div>
                  <p className="text-xs text-green-600 font-medium">+15% from last month</p>
                </CardContent>
              </Card>

              <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Active Companies</CardTitle>
                  <Building2 className="h-4 w-4 text-slate-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">4</div>
                  <p className="text-xs text-slate-600 font-medium">123 total employees</p>
                </CardContent>
              </Card>

              <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Tax Collected</CardTitle>
                  <TrendingUp className="h-4 w-4 text-slate-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">₵45,783.15</div>
                  <p className="text-xs text-blue-600 font-medium">15% of total volume</p>
                </CardContent>
              </Card>

              <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">Compliance Rate</CardTitle>
                  <Shield className="h-4 w-4 text-slate-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900">92%</div>
                  <p className="text-xs text-amber-600 font-medium">2 minor issues</p>
                </CardContent>
              </Card>

              <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">System Health</CardTitle>
                  <CheckCircle className="h-4 w-4 text-slate-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">Healthy</div>
                  <p className="text-xs text-slate-600 font-medium">All systems operational</p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="companies" className="space-y-6">
              <TabsList className="bg-white/95 backdrop-blur-sm border-0 shadow-lg">
                <TabsTrigger
                  value="companies"
                  className="data-[state=active]:bg-slate-900 data-[state=active]:text-white"
                >
                  Company Management
                </TabsTrigger>
                <TabsTrigger
                  value="compliance"
                  className="data-[state=active]:bg-slate-900 data-[state=active]:text-white"
                >
                  Compliance Monitor
                </TabsTrigger>
                <TabsTrigger value="rates" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white">
                  Rate Management
                </TabsTrigger>
                <TabsTrigger
                  value="settings"
                  className="data-[state=active]:bg-slate-900 data-[state=active]:text-white"
                >
                  System Settings
                </TabsTrigger>
              </TabsList>

              <TabsContent value="companies">
                <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-lg">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-slate-900">Registered Companies</CardTitle>
                        <CardDescription className="text-slate-600">
                          Monitor all organizations in the system
                        </CardDescription>
                      </div>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <Input
                          placeholder="Search companies..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 bg-white border-slate-300 focus:border-violet-500 focus:ring-violet-500/20 w-64"
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-200">
                          <TableHead className="text-slate-600 font-medium">Company</TableHead>
                          <TableHead className="text-slate-600 font-medium">Type</TableHead>
                          <TableHead className="text-slate-600 font-medium">Employees</TableHead>
                          <TableHead className="text-slate-600 font-medium">Total Spent</TableHead>
                          <TableHead className="text-slate-600 font-medium">Tax Collected</TableHead>
                          <TableHead className="text-slate-600 font-medium">Compliance</TableHead>
                          <TableHead className="text-slate-600 font-medium">Last Activity</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {companies.map((company) => (
                          <TableRow key={company.id} className="border-slate-200">
                            <TableCell className="text-slate-900 font-medium">{company.name}</TableCell>
                            <TableCell className="text-slate-600">{company.type}</TableCell>
                            <TableCell className="text-slate-600">{company.employees}</TableCell>
                            <TableCell className="text-slate-900 font-semibold">
                              ₵{company.totalSpent.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-slate-900 font-semibold">
                              ₵{company.taxCollected.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  company.compliance === "compliant"
                                    ? "bg-green-100 text-green-700 border-green-200"
                                    : "bg-amber-100 text-amber-700 border-amber-200"
                                }
                              >
                                {company.compliance}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-slate-600">{company.lastActivity}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="compliance">
                <div className="space-y-6">
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white">Compliance Issues</CardTitle>
                      <CardDescription className="text-slate-300">
                        Monitor and resolve compliance violations
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-700">
                            <TableHead className="text-slate-300">Issue ID</TableHead>
                            <TableHead className="text-slate-300">Company</TableHead>
                            <TableHead className="text-slate-300">Type</TableHead>
                            <TableHead className="text-slate-300">Severity</TableHead>
                            <TableHead className="text-slate-300">Description</TableHead>
                            <TableHead className="text-slate-300">Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {complianceIssues.map((issue) => (
                            <TableRow key={issue.id} className="border-slate-700">
                              <TableCell className="text-slate-300 font-mono">{issue.id}</TableCell>
                              <TableCell className="text-white">{issue.company}</TableCell>
                              <TableCell className="text-slate-300">{issue.type}</TableCell>
                              <TableCell>
                                <Badge
                                  className={
                                    issue.severity === "high"
                                      ? "bg-red-600/20 text-red-400 border-red-600/30"
                                      : issue.severity === "medium"
                                        ? "bg-yellow-600/20 text-yellow-400 border-yellow-600/30"
                                        : "bg-blue-600/20 text-blue-400 border-blue-600/30"
                                  }
                                >
                                  {issue.severity}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-slate-300">{issue.description}</TableCell>
                              <TableCell className="text-slate-300">{issue.date}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="rates">
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Standardized Rates</CardTitle>
                    <CardDescription className="text-slate-300">
                      Manage charging rates across all sectors
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-700">
                          <TableHead className="text-slate-300">Sector</TableHead>
                          <TableHead className="text-slate-300">Category</TableHead>
                          <TableHead className="text-slate-300">Current Rate</TableHead>
                          <TableHead className="text-slate-300">Proposed Rate</TableHead>
                          <TableHead className="text-slate-300">Status</TableHead>
                          <TableHead className="text-slate-300">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {systemRates.map((rate, index) => (
                          <TableRow key={index} className="border-slate-700">
                            <TableCell className="text-white">{rate.sector}</TableCell>
                            <TableCell className="text-slate-300">{rate.category}</TableCell>
                            <TableCell className="text-white font-semibold">{rate.currentRate}%</TableCell>
                            <TableCell className="text-white font-semibold">{rate.proposedRate}%</TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  rate.status === "active"
                                    ? "bg-green-600/20 text-green-400 border-green-600/30"
                                    : "bg-yellow-600/20 text-yellow-400 border-yellow-600/30"
                                }
                              >
                                {rate.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                {rate.status === "pending" && (
                                  <>
                                    <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                      Approve
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                                    >
                                      Edit
                                    </Button>
                                  </>
                                )}
                                {rate.status === "active" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                                  >
                                    Modify
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-slate-900">System Configuration</CardTitle>
                      <CardDescription className="text-slate-600">
                        Global system settings and preferences
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-slate-700 font-medium">Auto-approve small transactions</Label>
                          <p className="text-sm text-slate-600">Automatically approve transactions under ₵100</p>
                        </div>
                        <Switch />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-slate-700 font-medium">Real-time compliance monitoring</Label>
                          <p className="text-sm text-slate-600">Monitor compliance violations in real-time</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-slate-700 font-medium">Automated tax collection</Label>
                          <p className="text-sm text-slate-600">Automatically collect taxes on all transactions</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-lg">
                    <CardHeader>
                      <CardTitle className="text-slate-900">Notification Settings</CardTitle>
                      <CardDescription className="text-slate-600">Configure system-wide notifications</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-slate-700 font-medium">Compliance alerts</Label>
                          <p className="text-sm text-slate-600">Notify on compliance violations</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-slate-700 font-medium">High-value transaction alerts</Label>
                          <p className="text-sm text-slate-600">Alert on transactions over ₵10,000</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-slate-700 font-medium">System maintenance notifications</Label>
                          <p className="text-sm text-slate-600">Notify users of scheduled maintenance</p>
                        </div>
                        <Switch />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  )
}
