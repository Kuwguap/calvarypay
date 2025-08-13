"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Settings,
  Building2,
  Users,
  DollarSign,
  Bell,
  Shield,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Save,
  Key,
  Globe,
  CreditCard,
  Mail,
  Phone
} from "lucide-react"
import { MerchantLayout } from "@/components/dashboard/role-based-layout"
import { withRouteProtection } from "@/lib/auth/route-protection"
import { useAuth } from "@/lib/hooks/use-auth"
import { formatCurrency } from "@/lib/utils"
import Link from "next/link"

// Types
interface CompanySettings {
  companyName: string
  companyEmail: string
  companyPhone: string
  companyAddress: string
  defaultCurrency: string
  spendingLimits: {
    daily: number
    monthly: number
    perTransaction: number
  }
  approvalSettings: {
    requireApproval: boolean
    approvalThreshold: number
    autoApproveCategories: string[]
  }
  notifications: {
    emailNotifications: boolean
    smsNotifications: boolean
    transactionAlerts: boolean
    weeklyReports: boolean
    monthlyReports: boolean
  }
  security: {
    twoFactorAuth: boolean
    sessionTimeout: number
    ipWhitelist: string[]
  }
}

function SettingsPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  // State
  const [activeTab, setActiveTab] = useState("company")
  const [hasChanges, setHasChanges] = useState(false)

  // Fetch company settings
  const {
    data: settings,
    isLoading: settingsLoading,
    error: settingsError,
    refetch: refetchSettings
  } = useQuery({
    queryKey: ['merchant-settings'],
    queryFn: async (): Promise<CompanySettings> => {
      const response = await fetch('/api/merchant/settings', {
        headers: {
          'Authorization': `Bearer ${user?.accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch settings')
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
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${user?.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedSettings)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to update settings')
      }

      return response.json()
    },
    onSuccess: () => {
      setHasChanges(false)
      queryClient.invalidateQueries({ queryKey: ['merchant-settings'] })
    },
    onError: (error: unknown) => {
      console.error('Settings update failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to update settings'
      console.error('Error message:', errorMessage)
    }
  })

  // Handle settings update
  const handleUpdateSettings = (updates: Partial<CompanySettings>) => {
    if (settings) {
      const updatedSettings = { ...settings, ...updates }
      updateSettingsMutation.mutate(updates)
      setHasChanges(true)
    }
  }

  // Currency options
  const CURRENCIES = [
    { value: "GHS", label: "Ghana Cedi (₵)" },
    { value: "NGN", label: "Nigerian Naira (₦)" },
    { value: "USD", label: "US Dollar ($)" },
    { value: "EUR", label: "Euro (€)" },
    { value: "GBP", label: "British Pound (£)" }
  ]

  // Categories for auto-approval
  const CATEGORIES = [
    { value: "fuel", label: "Fuel" },
    { value: "maintenance", label: "Maintenance" },
    { value: "toll", label: "Toll Fees" },
    { value: "parking", label: "Parking" },
    { value: "food", label: "Food & Meals" },
    { value: "supplies", label: "Office Supplies" },
    { value: "transport", label: "Transportation" }
  ]

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
              <h1 className="text-3xl font-bold text-white mb-2">Company Settings</h1>
              <p className="text-slate-400">Manage your company preferences and configurations</p>
            </div>
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
            {hasChanges && (
              <Button
                onClick={() => updateSettingsMutation.mutate(settings || {})}
                disabled={updateSettingsMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            )}
          </div>
        </div>

        {/* Error State */}
        {settingsError && (
          <Alert className="bg-red-500/20 border-red-500/30">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-400">
              Failed to load settings. Please try again.
            </AlertDescription>
          </Alert>
        )}

        {/* Success State */}
        {updateSettingsMutation.isSuccess && (
          <Alert className="bg-emerald-500/20 border-emerald-500/30">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="text-emerald-400">
              Settings updated successfully!
            </AlertDescription>
          </Alert>
        )}

        {/* Settings Tabs */}
        <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white text-xl font-semibold flex items-center">
              <Settings className="w-5 h-5 mr-2 text-blue-400" />
              Company Configuration
            </CardTitle>
            <CardDescription className="text-slate-400">
              Configure your company settings and preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-5 bg-slate-800/50">
                <TabsTrigger value="company" className="data-[state=active]:bg-blue-600">
                  <Building2 className="w-4 h-4 mr-2" />
                  Company
                </TabsTrigger>
                <TabsTrigger value="spending" className="data-[state=active]:bg-blue-600">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Spending
                </TabsTrigger>
                <TabsTrigger value="approvals" className="data-[state=active]:bg-blue-600">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approvals
                </TabsTrigger>
                <TabsTrigger value="notifications" className="data-[state=active]:bg-blue-600">
                  <Bell className="w-4 h-4 mr-2" />
                  Notifications
                </TabsTrigger>
                <TabsTrigger value="security" className="data-[state=active]:bg-blue-600">
                  <Shield className="w-4 h-4 mr-2" />
                  Security
                </TabsTrigger>
              </TabsList>

              {settingsLoading ? (
                <div className="space-y-6">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="space-y-4">
                      <Skeleton className="h-6 w-48 bg-slate-700" />
                      <Skeleton className="h-10 w-full bg-slate-700" />
                    </div>
                  ))}
                </div>
              ) : settings ? (
                <>
                  {/* Company Information */}
                  <TabsContent value="company" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="companyName" className="text-slate-300">Company Name</Label>
                        <Input
                          id="companyName"
                          value={settings.companyName}
                          onChange={(e) => handleUpdateSettings({ companyName: e.target.value })}
                          className="bg-slate-800 border-slate-700 text-white focus:border-blue-500"
                          placeholder="Enter company name"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="defaultCurrency" className="text-slate-300">Default Currency</Label>
                        <Select 
                          value={settings.defaultCurrency} 
                          onValueChange={(value) => handleUpdateSettings({ defaultCurrency: value })}
                        >
                          <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            {CURRENCIES.map((currency) => (
                              <SelectItem key={currency.value} value={currency.value}>
                                {currency.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="companyEmail" className="text-slate-300">Company Email</Label>
                        <Input
                          id="companyEmail"
                          type="email"
                          value={settings.companyEmail}
                          onChange={(e) => handleUpdateSettings({ companyEmail: e.target.value })}
                          className="bg-slate-800 border-slate-700 text-white focus:border-blue-500"
                          placeholder="company@example.com"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="companyPhone" className="text-slate-300">Company Phone</Label>
                        <Input
                          id="companyPhone"
                          type="tel"
                          value={settings.companyPhone}
                          onChange={(e) => handleUpdateSettings({ companyPhone: e.target.value })}
                          className="bg-slate-800 border-slate-700 text-white focus:border-blue-500"
                          placeholder="+233 XX XXX XXXX"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="companyAddress" className="text-slate-300">Company Address</Label>
                      <Textarea
                        id="companyAddress"
                        value={settings.companyAddress}
                        onChange={(e) => handleUpdateSettings({ companyAddress: e.target.value })}
                        className="bg-slate-800 border-slate-700 text-white focus:border-blue-500 min-h-[100px]"
                        placeholder="Enter company address"
                      />
                    </div>
                  </TabsContent>

                  {/* Spending Limits */}
                  <TabsContent value="spending" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="dailyLimit" className="text-slate-300">Daily Limit (₵)</Label>
                        <Input
                          id="dailyLimit"
                          type="number"
                          step="0.01"
                          value={settings.spendingLimits.daily}
                          onChange={(e) => handleUpdateSettings({ 
                            spendingLimits: { 
                              ...settings.spendingLimits, 
                              daily: parseFloat(e.target.value) || 0 
                            } 
                          })}
                          className="bg-slate-800 border-slate-700 text-white focus:border-blue-500"
                          placeholder="10000.00"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="monthlyLimit" className="text-slate-300">Monthly Limit (₵)</Label>
                        <Input
                          id="monthlyLimit"
                          type="number"
                          step="0.01"
                          value={settings.spendingLimits.monthly}
                          onChange={(e) => handleUpdateSettings({ 
                            spendingLimits: { 
                              ...settings.spendingLimits, 
                              monthly: parseFloat(e.target.value) || 0 
                            } 
                          })}
                          className="bg-slate-800 border-slate-700 text-white focus:border-blue-500"
                          placeholder="100000.00"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="transactionLimit" className="text-slate-300">Per Transaction Limit (₵)</Label>
                        <Input
                          id="transactionLimit"
                          type="number"
                          step="0.01"
                          value={settings.spendingLimits.perTransaction}
                          onChange={(e) => handleUpdateSettings({ 
                            spendingLimits: { 
                              ...settings.spendingLimits, 
                              perTransaction: parseFloat(e.target.value) || 0 
                            } 
                          })}
                          className="bg-slate-800 border-slate-700 text-white focus:border-blue-500"
                          placeholder="5000.00"
                        />
                      </div>
                    </div>
                    
                    <div className="p-4 bg-slate-800/50 rounded-lg">
                      <h4 className="text-white font-medium mb-2">Current Limits Summary</h4>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-slate-400">Daily:</span>
                          <span className="text-white ml-2">{formatCurrency(settings.spendingLimits.daily, 'GHS')}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Monthly:</span>
                          <span className="text-white ml-2">{formatCurrency(settings.spendingLimits.monthly, 'GHS')}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Per Transaction:</span>
                          <span className="text-white ml-2">{formatCurrency(settings.spendingLimits.perTransaction, 'GHS')}</span>
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Approval Settings */}
                  <TabsContent value="approvals" className="space-y-6">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                        <div>
                          <h4 className="text-white font-medium">Require Approval for Transactions</h4>
                          <p className="text-slate-400 text-sm">All transactions will need approval before processing</p>
                        </div>
                        <Switch
                          checked={settings.approvalSettings.requireApproval}
                          onCheckedChange={(checked) => handleUpdateSettings({
                            approvalSettings: { ...settings.approvalSettings, requireApproval: checked }
                          })}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="approvalThreshold" className="text-slate-300">Approval Threshold (₵)</Label>
                        <Input
                          id="approvalThreshold"
                          type="number"
                          step="0.01"
                          value={settings.approvalSettings.approvalThreshold}
                          onChange={(e) => handleUpdateSettings({ 
                            approvalSettings: { 
                              ...settings.approvalSettings, 
                              approvalThreshold: parseFloat(e.target.value) || 0 
                            } 
                          })}
                          className="bg-slate-800 border-slate-700 text-white focus:border-blue-500"
                          placeholder="1000.00"
                        />
                        <p className="text-slate-400 text-sm">Transactions above this amount will require approval</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-slate-300">Auto-Approve Categories</Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {CATEGORIES.map((category) => (
                            <div key={category.value} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={category.value}
                                checked={settings.approvalSettings.autoApproveCategories.includes(category.value)}
                                onChange={(e) => {
                                  const categories = e.target.checked
                                    ? [...settings.approvalSettings.autoApproveCategories, category.value]
                                    : settings.approvalSettings.autoApproveCategories.filter(c => c !== category.value)
                                  
                                  handleUpdateSettings({
                                    approvalSettings: { ...settings.approvalSettings, autoApproveCategories: categories }
                                  })
                                }}
                                className="rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500"
                              />
                              <label htmlFor={category.value} className="text-slate-300 text-sm">
                                {category.label}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  {/* Notification Settings */}
                  <TabsContent value="notifications" className="space-y-6">
                    <div className="space-y-4">
                      {[
                        { key: 'emailNotifications', label: 'Email Notifications', description: 'Receive notifications via email' },
                        { key: 'smsNotifications', label: 'SMS Notifications', description: 'Receive notifications via SMS' },
                        { key: 'transactionAlerts', label: 'Transaction Alerts', description: 'Get notified of all transactions' },
                        { key: 'weeklyReports', label: 'Weekly Reports', description: 'Receive weekly summary reports' },
                        { key: 'monthlyReports', label: 'Monthly Reports', description: 'Receive monthly summary reports' }
                      ].map((notification) => (
                        <div key={notification.key} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                          <div>
                            <h4 className="text-white font-medium">{notification.label}</h4>
                            <p className="text-slate-400 text-sm">{notification.description}</p>
                          </div>
                          <Switch
                            checked={settings.notifications[notification.key as keyof typeof settings.notifications]}
                            onCheckedChange={(checked) => handleUpdateSettings({
                              notifications: { ...settings.notifications, [notification.key]: checked }
                            })}
                          />
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  {/* Security Settings */}
                  <TabsContent value="security" className="space-y-6">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                        <div>
                          <h4 className="text-white font-medium">Two-Factor Authentication</h4>
                          <p className="text-slate-400 text-sm">Add an extra layer of security to your account</p>
                        </div>
                        <Switch
                          checked={settings.security.twoFactorAuth}
                          onCheckedChange={(checked) => handleUpdateSettings({
                            security: { ...settings.security, twoFactorAuth: checked }
                          })}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="sessionTimeout" className="text-slate-300">Session Timeout (minutes)</Label>
                        <Select 
                          value={settings.security.sessionTimeout.toString()} 
                          onValueChange={(value) => handleUpdateSettings({
                            security: { ...settings.security, sessionTimeout: parseInt(value) }
                          })}
                        >
                          <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700">
                            <SelectItem value="15">15 minutes</SelectItem>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="60">1 hour</SelectItem>
                            <SelectItem value="120">2 hours</SelectItem>
                            <SelectItem value="480">8 hours</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </TabsContent>
                </>
              ) : null}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </MerchantLayout>
  )
}

export default withRouteProtection(SettingsPage, ['merchant'])
