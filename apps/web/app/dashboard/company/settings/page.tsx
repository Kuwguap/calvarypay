"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
  Settings,
  Building2,
  Users,
  Shield,
  CreditCard,
  Bell,
  Globe,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Activity,
  TrendingUp,
  Calendar,
  FileText,
  Download,
  Upload
} from "lucide-react"
import { MerchantLayout } from "@/components/dashboard/role-based-layout"
import { withRouteProtection } from "@/lib/auth/route-protection"
import { useAuth } from "@/lib/hooks/use-auth"
import { formatCurrency, formatDate } from "@/lib/utils"

// Types
interface CompanySettings {
  company: {
    id: string
    name: string
    email: string
    phone?: string
    address?: string
    website?: string
    description?: string
    industry?: string
    foundedYear?: number
    employeeCount?: number
    currency: string
    timezone: string
    language: string
  }
  security: {
    twoFactorEnabled: boolean
    sessionTimeout: number
    passwordPolicy: {
      minLength: number
      requireUppercase: boolean
      requireLowercase: boolean
      requireNumbers: boolean
      requireSpecialChars: boolean
      expiryDays: number
    }
    ipWhitelist: string[]
    loginAttempts: number
    lockoutDuration: number
  }
  notifications: {
    emailNotifications: boolean
    smsNotifications: boolean
    pushNotifications: boolean
    transactionAlerts: boolean
    budgetAlerts: boolean
    securityAlerts: boolean
    marketingEmails: boolean
  }
  payment: {
    defaultCurrency: string
    supportedCurrencies: string[]
    transferLimits: {
      daily: number
      monthly: number
      single: number
    }
    fees: {
      employeeTransfer: number
      externalTransfer: number
      urgentTransfer: number
    }
    autoApproval: boolean
    requireApproval: boolean
  }
  compliance: {
    kycRequired: boolean
    amlEnabled: boolean
    auditLogging: boolean
    dataRetention: number
    gdprCompliant: boolean
    regulatoryReporting: boolean
  }
}

interface CompanyStats {
  totalEmployees: number
  totalTransactions: number
  totalRevenue: number
  activeSince: string
  lastActivity: string
  complianceScore: number
  riskLevel: string
}

function CompanySettingsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState("company")
  const [showPassword, setShowPassword] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  // Fetch company settings
  const {
    data: settingsData,
    isLoading: settingsLoading,
    error: settingsError,
    refetch: refetchSettings
  } = useQuery({
    queryKey: ['company-settings'],
    queryFn: async (): Promise<CompanySettings> => {
      const response = await fetch('/api/merchant/settings', {
        headers: {
          'Authorization': `Bearer ${user?.accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch company settings')
      }

      return response.json()
    },
    enabled: !!user?.accessToken,
    staleTime: 300000, // 5 minutes
  })

  // Fetch company statistics
  const {
    data: companyStats,
    isLoading: statsLoading,
    error: statsError
  } = useQuery({
    queryKey: ['company-stats'],
    queryFn: async (): Promise<CompanyStats> => {
      const response = await fetch('/api/merchant/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${user?.accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch company statistics')
      }

      return response.json()
    },
    enabled: !!user?.accessToken,
    staleTime: 300000, // 5 minutes
  })

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (updatedSettings: Partial<CompanySettings>) => {
      const response = await fetch('/api/merchant/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user?.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedSettings)
      })

      if (!response.ok) {
        throw new Error('Failed to update settings')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-settings'] })
      setIsEditing(false)
    }
  })

  // Get risk level color
  const getRiskLevelColor = (riskLevel: string) => {
    switch (riskLevel.toLowerCase()) {
      case 'low':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'high':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    }
  }

  // Get compliance score color
  const getComplianceScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-400'
    if (score >= 70) return 'text-yellow-400'
    return 'text-red-400'
  }

  if (settingsError) {
    return (
      <MerchantLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load company settings: {settingsError.message}
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
            <h1 className="text-3xl font-bold text-white mb-2">Company Settings</h1>
            <p className="text-slate-400">Manage your organization's configuration and preferences</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchSettings()}
              disabled={settingsLoading}
              className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${settingsLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            {isEditing ? (
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    // Save changes
                    updateSettingsMutation.mutate(settingsData!)
                  }}
                  disabled={updateSettingsMutation.isPending}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateSettingsMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setIsEditing(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Settings className="w-4 h-4 mr-2" />
                Edit Settings
              </Button>
            )}
          </div>
        </div>

        {/* Company Overview */}
        {companyStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm font-medium">Total Employees</p>
                    <p className="text-2xl font-bold text-white">
                      {companyStats.totalEmployees}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-500/20 rounded-lg">
                    <Users className="w-6 h-6 text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm font-medium">Total Revenue</p>
                    <p className="text-2xl font-bold text-white">
                      {formatCurrency(companyStats.totalRevenue, 'GHS')}
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
                    <p className="text-slate-400 text-sm font-medium">Compliance Score</p>
                    <p className={`text-2xl font-bold ${getComplianceScoreColor(companyStats.complianceScore)}`}>
                      {companyStats.complianceScore}%
                    </p>
                  </div>
                  <div className="p-3 bg-purple-500/20 rounded-lg">
                    <Shield className="w-6 h-6 text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm font-medium">Risk Level</p>
                    <Badge className={getRiskLevelColor(companyStats.riskLevel)}>
                      {companyStats.riskLevel}
                    </Badge>
                  </div>
                  <div className="p-3 bg-amber-500/20 rounded-lg">
                    <AlertCircle className="w-6 h-6 text-amber-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6 bg-slate-800 border-slate-600">
            <TabsTrigger value="company" className="text-slate-300 data-[state=active]:bg-slate-700">
              <Building2 className="w-4 h-4 mr-2" />
              Company
            </TabsTrigger>
            <TabsTrigger value="security" className="text-slate-300 data-[state=active]:bg-slate-700">
              <Shield className="w-4 h-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger value="notifications" className="text-slate-300 data-[state=active]:bg-slate-700">
              <Bell className="w-4 h-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="payment" className="text-slate-300 data-[state=active]:bg-slate-700">
              <CreditCard className="w-4 h-4 mr-2" />
              Payment
            </TabsTrigger>
            <TabsTrigger value="compliance" className="text-slate-300 data-[state=active]:bg-slate-700">
              <FileText className="w-4 h-4 mr-2" />
              Compliance
            </TabsTrigger>
            <TabsTrigger value="advanced" className="text-slate-300 data-[state=active]:bg-slate-700">
              <Settings className="w-4 h-4 mr-2" />
              Advanced
            </TabsTrigger>
          </TabsList>

          {/* Company Tab */}
          <TabsContent value="company" className="space-y-6">
            <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Company Information</CardTitle>
                <CardDescription className="text-slate-400">
                  Basic company details and contact information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="companyName" className="text-slate-300">Company Name</Label>
                    <Input
                      id="companyName"
                      value={settingsData?.company.name || ''}
                      disabled={!isEditing}
                      className="bg-slate-800 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="companyEmail" className="text-slate-300">Email</Label>
                    <Input
                      id="companyEmail"
                      value={settingsData?.company.email || ''}
                      disabled={!isEditing}
                      className="bg-slate-800 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="companyPhone" className="text-slate-300">Phone</Label>
                    <Input
                      id="companyPhone"
                      value={settingsData?.company.phone || ''}
                      disabled={!isEditing}
                      className="bg-slate-800 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="companyWebsite" className="text-slate-300">Website</Label>
                    <Input
                      id="companyWebsite"
                      value={settingsData?.company.website || ''}
                      disabled={!isEditing}
                      className="bg-slate-800 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="companyIndustry" className="text-slate-300">Industry</Label>
                    <Input
                      id="companyIndustry"
                      value={settingsData?.company.industry || ''}
                      disabled={!isEditing}
                      className="bg-slate-800 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="companyFounded" className="text-slate-300">Founded Year</Label>
                    <Input
                      id="companyFounded"
                      value={settingsData?.company.foundedYear || ''}
                      disabled={!isEditing}
                      className="bg-slate-800 border-slate-600 text-white"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="companyDescription" className="text-slate-300">Description</Label>
                  <Textarea
                    id="companyDescription"
                    value={settingsData?.company.description || ''}
                    disabled={!isEditing}
                    className="bg-slate-800 border-slate-600 text-white"
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="companyAddress" className="text-slate-300">Address</Label>
                  <Textarea
                    id="companyAddress"
                    value={settingsData?.company.address || ''}
                    disabled={!isEditing}
                    className="bg-slate-800 border-slate-600 text-white"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Regional Settings</CardTitle>
                <CardDescription className="text-slate-400">
                  Currency, timezone, and language preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <Label htmlFor="currency" className="text-slate-300">Default Currency</Label>
                    <Select value={settingsData?.company.currency || 'GHS'} disabled={!isEditing}>
                      <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        <SelectItem value="GHS">GHS - Ghanaian Cedi</SelectItem>
                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                        <SelectItem value="GBP">GBP - British Pound</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="timezone" className="text-slate-300">Timezone</Label>
                    <Select value={settingsData?.company.timezone || 'Africa/Accra'} disabled={!isEditing}>
                      <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        <SelectItem value="Africa/Accra">Africa/Accra (GMT+0)</SelectItem>
                        <SelectItem value="UTC">UTC (GMT+0)</SelectItem>
                        <SelectItem value="America/New_York">America/New_York (GMT-5)</SelectItem>
                        <SelectItem value="Europe/London">Europe/London (GMT+0)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="language" className="text-slate-300">Language</Label>
                    <Select value={settingsData?.company.language || 'en'} disabled={!isEditing}>
                      <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Security Settings</CardTitle>
                <CardDescription className="text-slate-400">
                  Configure security policies and authentication settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-slate-300">Two-Factor Authentication</Label>
                    <p className="text-slate-400 text-sm">Require 2FA for all users</p>
                  </div>
                  <Switch
                    checked={settingsData?.security.twoFactorEnabled || false}
                    disabled={!isEditing}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="sessionTimeout" className="text-slate-300">Session Timeout (minutes)</Label>
                    <Input
                      id="sessionTimeout"
                      type="number"
                      value={settingsData?.security.sessionTimeout || 30}
                      disabled={!isEditing}
                      className="bg-slate-800 border-slate-600 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="loginAttempts" className="text-slate-300">Max Login Attempts</Label>
                    <Input
                      id="loginAttempts"
                      type="number"
                      value={settingsData?.security.loginAttempts || 5}
                      disabled={!isEditing}
                      className="bg-slate-800 border-slate-600 text-white"
                    />
                  </div>
                </div>

                <Separator className="bg-slate-700" />

                <div>
                  <Label className="text-slate-300 mb-4 block">Password Policy</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="minLength" className="text-slate-400 text-sm">Minimum Length</Label>
                      <Input
                        id="minLength"
                        type="number"
                        value={settingsData?.security.passwordPolicy.minLength || 8}
                        disabled={!isEditing}
                        className="bg-slate-800 border-slate-600 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="expiryDays" className="text-slate-400 text-sm">Expiry (days)</Label>
                      <Input
                        id="expiryDays"
                        type="number"
                        value={settingsData?.security.passwordPolicy.expiryDays || 90}
                        disabled={!isEditing}
                        className="bg-slate-800 border-slate-600 text-white"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Notification Preferences</CardTitle>
                <CardDescription className="text-slate-400">
                  Configure how and when you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-slate-300">Email Notifications</Label>
                      <p className="text-slate-400 text-sm">Receive notifications via email</p>
                    </div>
                    <Switch
                      checked={settingsData?.notifications.emailNotifications || false}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-slate-300">SMS Notifications</Label>
                      <p className="text-slate-400 text-sm">Receive notifications via SMS</p>
                    </div>
                    <Switch
                      checked={settingsData?.notifications.smsNotifications || false}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-slate-300">Push Notifications</Label>
                      <p className="text-slate-400 text-sm">Receive push notifications</p>
                    </div>
                    <Switch
                      checked={settingsData?.notifications.pushNotifications || false}
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                <Separator className="bg-slate-700" />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-slate-300">Transaction Alerts</Label>
                      <p className="text-slate-400 text-sm">Get notified of all transactions</p>
                    </div>
                    <Switch
                      checked={settingsData?.notifications.transactionAlerts || false}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-slate-300">Budget Alerts</Label>
                      <p className="text-slate-400 text-sm">Get notified of budget allocations</p>
                    </div>
                    <Switch
                      checked={settingsData?.notifications.budgetAlerts || false}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-slate-300">Security Alerts</Label>
                      <p className="text-slate-400 text-sm">Get notified of security events</p>
                    </div>
                    <Switch
                      checked={settingsData?.notifications.securityAlerts || false}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Tab */}
          <TabsContent value="payment" className="space-y-6">
            <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Payment Configuration</CardTitle>
                <CardDescription className="text-slate-400">
                  Configure payment settings and transfer limits
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="defaultCurrency" className="text-slate-300">Default Currency</Label>
                    <Select value={settingsData?.payment.defaultCurrency || 'GHS'} disabled={!isEditing}>
                      <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        <SelectItem value="GHS">GHS - Ghanaian Cedi</SelectItem>
                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                        <SelectItem value="GBP">GBP - British Pound</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="autoApproval" className="text-slate-300">Auto-Approval</Label>
                    <Select value={settingsData?.payment.autoApproval ? 'true' : 'false'} disabled={!isEditing}>
                      <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-600">
                        <SelectItem value="true">Enabled</SelectItem>
                        <SelectItem value="false">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator className="bg-slate-700" />

                <div>
                  <Label className="text-slate-300 mb-4 block">Transfer Limits</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="dailyLimit" className="text-slate-400 text-sm">Daily Limit</Label>
                      <Input
                        id="dailyLimit"
                        type="number"
                        value={settingsData?.payment.transferLimits.daily || 10000}
                        disabled={!isEditing}
                        className="bg-slate-800 border-slate-600 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="monthlyLimit" className="text-slate-400 text-sm">Monthly Limit</Label>
                      <Input
                        id="monthlyLimit"
                        type="number"
                        value={settingsData?.payment.transferLimits.monthly || 100000}
                        disabled={!isEditing}
                        className="bg-slate-800 border-slate-600 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="singleLimit" className="text-slate-400 text-sm">Single Transfer Limit</Label>
                      <Input
                        id="singleLimit"
                        type="number"
                        value={settingsData?.payment.transferLimits.single || 5000}
                        disabled={!isEditing}
                        className="bg-slate-800 border-slate-600 text-white"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compliance Tab */}
          <TabsContent value="compliance" className="space-y-6">
            <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Compliance & Regulatory</CardTitle>
                <CardDescription className="text-slate-400">
                  Configure compliance settings and regulatory requirements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-slate-300">KYC Required</Label>
                      <p className="text-slate-400 text-sm">Require Know Your Customer verification</p>
                    </div>
                    <Switch
                      checked={settingsData?.compliance.kycRequired || false}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-slate-300">AML Enabled</Label>
                      <p className="text-slate-400 text-sm">Enable Anti-Money Laundering monitoring</p>
                    </div>
                    <Switch
                      checked={settingsData?.compliance.amlEnabled || false}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-slate-300">Audit Logging</Label>
                      <p className="text-slate-400 text-sm">Log all system activities for audit</p>
                    </div>
                    <Switch
                      checked={settingsData?.compliance.auditLogging || false}
                      disabled={!isEditing}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-slate-300">GDPR Compliant</Label>
                      <p className="text-slate-400 text-sm">Ensure GDPR compliance</p>
                    </div>
                    <Switch
                      checked={settingsData?.compliance.gdprCompliant || false}
                      disabled={!isEditing}
                    />
                  </div>
                </div>

                <Separator className="bg-slate-700" />

                <div>
                  <Label htmlFor="dataRetention" className="text-slate-300">Data Retention (days)</Label>
                  <Input
                    id="dataRetention"
                    type="number"
                    value={settingsData?.compliance.dataRetention || 2555}
                    disabled={!isEditing}
                    className="bg-slate-800 border-slate-600 text-white"
                  />
                  <p className="text-slate-400 text-sm mt-1">
                    How long to retain transaction and user data
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-6">
            <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Advanced Settings</CardTitle>
                <CardDescription className="text-slate-400">
                  Advanced configuration and system settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="exportData" className="text-slate-300">Export Company Data</Label>
                    <Button
                      variant="outline"
                      className="w-full mt-2 border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Export All Data
                    </Button>
                  </div>
                  <div>
                    <Label htmlFor="importData" className="text-slate-300">Import Company Data</Label>
                    <Button
                      variant="outline"
                      className="w-full mt-2 border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Import Data
                    </Button>
                  </div>
                </div>

                <Separator className="bg-slate-700" />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-slate-300">Debug Mode</Label>
                      <p className="text-slate-400 text-sm">Enable detailed logging and debugging</p>
                    </div>
                    <Switch disabled={!isEditing} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-slate-300">Maintenance Mode</Label>
                      <p className="text-slate-400 text-sm">Put system in maintenance mode</p>
                    </div>
                    <Switch disabled={!isEditing} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MerchantLayout>
  )
}

export default withRouteProtection(CompanySettingsPage, ['merchant', 'admin'])
