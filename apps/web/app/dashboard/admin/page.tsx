"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
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
  RefreshCw,
  AlertTriangle,
} from "lucide-react"
import Link from "next/link"
import { AdminLayout } from "@/components/dashboard/role-based-layout"
import { withRouteProtection } from "@/lib/auth/route-protection"
import { useAuth } from "@/lib/hooks/use-auth"

// Format currency helper
const formatCurrency = (amount: number, currency: string = 'GHS') => {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount).replace(currency, `₵`)
}

function AdminDashboard() {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [isCompanyDialogOpen, setIsCompanyDialogOpen] = useState(false)
  const [isRateDialogOpen, setIsRateDialogOpen] = useState(false)

  // Fetch admin dashboard data
  const {
    data: dashboardData,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['adminDashboard'],
    queryFn: async () => {
      const token = localStorage.getItem('calvarypay_access_token') || localStorage.getItem('auth_token')
      
      if (!token) {
        throw new Error('No authentication token available')
      }

      const response = await fetch('/api/admin/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error?.message || 'Failed to fetch admin dashboard data')
      }

      const result = await response.json()
      return result.data
    },
    retry: 2,
    staleTime: 30000, // 30 seconds
  })

  // Filter companies based on search term
  const filteredCompanies = dashboardData?.companies?.filter(company =>
    company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    company.email.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  if (error) {
    return (
      <AdminLayout>
        <div className="space-y-8">
          <Alert className="bg-red-900/20 border-red-800 text-red-200">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Failed to load admin dashboard: {error.message}
            </AlertDescription>
          </Alert>
          <Button onClick={() => refetch()} className="bg-blue-600 hover:bg-blue-700">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Welcome Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">System Administration</h1>
            <p className="text-slate-400 mt-1">Monitor and regulate payment activities across all organizations</p>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={() => refetch()}
              disabled={isLoading}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Dialog open={isCompanyDialogOpen} onOpenChange={setIsCompanyDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Company
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700 text-white">
                <DialogHeader>
                  <DialogTitle>Register New Company</DialogTitle>
                  <DialogDescription className="text-slate-300">
                    Add a new organization to the CalvaryPay system
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      placeholder="Metro Mass Transit Ghana"
                      className="bg-slate-700 border-slate-600"
                    />
                  </div>
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
                        <SelectItem value="logistics">Logistics</SelectItem>
                        <SelectItem value="manufacturing">Manufacturing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminEmail">Admin Email</Label>
                    <Input
                      id="adminEmail"
                      type="email"
                      placeholder="admin@company.com"
                      className="bg-slate-700 border-slate-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="taxRate">Tax Rate (%)</Label>
                    <Input
                      id="taxRate"
                      type="number"
                      placeholder="15.0"
                      className="bg-slate-700 border-slate-600"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button className="flex-1 bg-blue-600 hover:bg-blue-700">Register Company</Button>
                    <Button
                      variant="outline"
                      className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
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
                  className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                >
                  <Sliders className="w-4 h-4 mr-2" />
                  Update Rates
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700 text-white">
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Total System Volume</CardTitle>
              <DollarSign className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-32 bg-slate-700" />
              ) : (
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(dashboardData?.stats?.totalSystemVolume || 0)}
                </div>
              )}
              <p className="text-xs text-slate-400">Total deposits across all companies</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Active Companies</CardTitle>
              <Building2 className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16 bg-slate-700" />
              ) : (
                <div className="text-2xl font-bold text-white">
                  {dashboardData?.stats?.activeCompanies || 0}
                </div>
              )}
              <p className="text-xs text-slate-400">
                {dashboardData?.stats?.totalEmployees || 0} total employees
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Tax Collected</CardTitle>
              <TrendingUp className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-28 bg-slate-700" />
              ) : (
                <div className="text-2xl font-bold text-white">
                  {formatCurrency(dashboardData?.stats?.taxCollected || 0)}
                </div>
              )}
              <p className="text-xs text-slate-400">15% of total volume</p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">Compliance Rate</CardTitle>
              <Shield className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-16 bg-slate-700" />
              ) : (
                <div className="text-2xl font-bold text-white">
                  {dashboardData?.stats?.complianceRate || 0}%
                </div>
              )}
              <p className="text-xs text-slate-400">
                {dashboardData?.complianceIssues?.length || 0} issues
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-300">System Health</CardTitle>
              <CheckCircle className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-8 w-20 bg-slate-700" />
              ) : (
                <div className="text-2xl font-bold text-green-400">
                  {dashboardData?.stats?.systemHealth || 'Unknown'}
                </div>
              )}
              <p className="text-xs text-slate-400">All systems operational</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="companies" className="space-y-6">
          <TabsList className="bg-slate-800/50 border-slate-700">
            <TabsTrigger value="companies" className="data-[state=active]:bg-blue-600">
              Company Management
            </TabsTrigger>
            <TabsTrigger value="compliance" className="data-[state=active]:bg-blue-600">
              Compliance Monitor
            </TabsTrigger>
            <TabsTrigger value="rates" className="data-[state=active]:bg-blue-600">
              Rate Management
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-blue-600">
              System Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="companies">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">Registered Companies</CardTitle>
                    <CardDescription className="text-slate-300">
                      Monitor all organizations in the system
                    </CardDescription>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <Input
                      placeholder="Search companies..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-slate-700 border-slate-600 text-white w-64"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex space-x-4">
                        <Skeleton className="h-4 w-32 bg-slate-700" />
                        <Skeleton className="h-4 w-20 bg-slate-700" />
                        <Skeleton className="h-4 w-16 bg-slate-700" />
                        <Skeleton className="h-4 w-24 bg-slate-700" />
                        <Skeleton className="h-4 w-24 bg-slate-700" />
                        <Skeleton className="h-4 w-20 bg-slate-700" />
                        <Skeleton className="h-4 w-24 bg-slate-700" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700">
                        <TableHead className="text-slate-300">Company</TableHead>
                        <TableHead className="text-slate-300">Type</TableHead>
                        <TableHead className="text-slate-300">Employees</TableHead>
                        <TableHead className="text-slate-300">Total Deposits</TableHead>
                        <TableHead className="text-slate-300">Current Balance</TableHead>
                        <TableHead className="text-slate-300">Tax Collected</TableHead>
                        <TableHead className="text-slate-300">Compliance</TableHead>
                        <TableHead className="text-slate-300">Last Activity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCompanies.length === 0 ? (
                        <TableRow className="border-slate-700">
                          <TableCell colSpan={8} className="text-center text-slate-400 py-8">
                            {searchTerm ? 'No companies found matching your search.' : 'No companies registered yet.'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredCompanies.map((company) => (
                          <TableRow key={company.id} className="border-slate-700">
                            <TableCell>
                              <div>
                                <div className="text-white font-medium">{company.name}</div>
                                <div className="text-slate-400 text-sm">{company.email}</div>
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-300">{company.type}</TableCell>
                            <TableCell className="text-slate-300">{company.employees}</TableCell>
                            <TableCell className="text-white font-semibold">
                              {formatCurrency(company.totalSpent)}
                            </TableCell>
                            <TableCell className="text-white font-semibold">
                              {formatCurrency(company.balance)}
                            </TableCell>
                            <TableCell className="text-white font-semibold">
                              {formatCurrency(company.taxCollected)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  company.compliance === "compliant"
                                    ? "bg-green-600/20 text-green-400 border-green-600/30"
                                    : "bg-yellow-600/20 text-yellow-400 border-yellow-600/30"
                                }
                              >
                                {company.compliance}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-slate-300">{company.lastActivity}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
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
                  {isLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex space-x-4">
                          <Skeleton className="h-4 w-24 bg-slate-700" />
                          <Skeleton className="h-4 w-32 bg-slate-700" />
                          <Skeleton className="h-4 w-20 bg-slate-700" />
                          <Skeleton className="h-4 w-16 bg-slate-700" />
                          <Skeleton className="h-4 w-48 bg-slate-700" />
                          <Skeleton className="h-4 w-24 bg-slate-700" />
                        </div>
                      ))}
                    </div>
                  ) : dashboardData?.complianceIssues?.length === 0 ? (
                    <div className="text-center text-slate-400 py-8">
                      <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-400" />
                      <p>No compliance issues found. All companies are in good standing.</p>
                    </div>
                  ) : (
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
                        {dashboardData?.complianceIssues?.map((issue) => (
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
                  )}
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
                {isLoading ? (
                  <div className="space-y-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="flex space-x-4">
                        <Skeleton className="h-4 w-24 bg-slate-700" />
                        <Skeleton className="h-4 w-20 bg-slate-700" />
                        <Skeleton className="h-4 w-16 bg-slate-700" />
                        <Skeleton className="h-4 w-16 bg-slate-700" />
                        <Skeleton className="h-4 w-16 bg-slate-700" />
                        <Skeleton className="h-4 w-24 bg-slate-700" />
                      </div>
                    ))}
                  </div>
                ) : (
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
                      {dashboardData?.systemRates?.map((rate, index) => (
                        <TableRow key={index} className="border-slate-700">
                          <TableCell className="text-white">{rate.sector}</TableCell>
                          <TableCell className="text-slate-300">{rate.category}</TableCell>
                          <TableCell className="text-white font-semibold">{(rate.currentRate * 100).toFixed(1)}%</TableCell>
                          <TableCell className="text-white font-semibold">{(rate.proposedRate * 100).toFixed(1)}%</TableCell>
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
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">System Configuration</CardTitle>
                  <CardDescription className="text-slate-300">
                    Global system settings and preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-slate-200">Auto-approve small transactions</Label>
                      <p className="text-sm text-slate-400">Automatically approve transactions under ₵100</p>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-slate-200">Real-time compliance monitoring</Label>
                      <p className="text-sm text-slate-400">Monitor compliance violations in real-time</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-slate-200">Automated tax collection</Label>
                      <p className="text-sm text-slate-400">Automatically collect taxes on all transactions</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-white">Notification Settings</CardTitle>
                  <CardDescription className="text-slate-300">Configure system-wide notifications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-slate-200">Compliance alerts</Label>
                      <p className="text-sm text-slate-400">Notify on compliance violations</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-slate-200">High-value transaction alerts</Label>
                      <p className="text-sm text-slate-400">Alert on transactions over ₵10,000</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-slate-200">System maintenance notifications</Label>
                      <p className="text-sm text-slate-400">Notify users of scheduled maintenance</p>
                    </div>
                    <Switch />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  )
}

// Export with route protection
export default withRouteProtection(AdminDashboard, ['admin'])
