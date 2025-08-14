'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Palette, 
  Globe, 
  Monitor, 
  Smartphone, 
  Settings, 
  Eye, 
  CheckCircle,
  Save,
  RefreshCw,
  Shield,
  Database,
  Bell,
  Users,
  CreditCard
} from 'lucide-react'
import { 
  LANDING_PAGE_TEMPLATES, 
  LandingPageTemplate,
  getActiveLandingPage 
} from '@/lib/config/landing-page.config'

export default function AdminSettingsPage() {
  const [activeTemplate, setActiveTemplate] = useState<LandingPageTemplate>(getActiveLandingPage())
  const [isLoading, setIsLoading] = useState(false)
  const [savedSettings, setSavedSettings] = useState({
    defaultTheme: 'classic',
    enableAnalytics: true,
    enableNotifications: true,
    enableAuditLogs: true,
    maintenanceMode: false
  })

  useEffect(() => {
    // Load saved settings from localStorage or API
    const loadSettings = () => {
      try {
        const saved = localStorage.getItem('admin-settings')
        if (saved) {
          setSavedSettings(JSON.parse(saved))
        }
      } catch (error) {
        console.error('Failed to load admin settings:', error)
      }
    }

    loadSettings()
  }, [])

  const handleThemeChange = (template: LandingPageTemplate) => {
    setActiveTemplate(template)
    // Update the active template in the configuration
    const updatedTemplates = LANDING_PAGE_TEMPLATES.map(t => ({
      ...t,
      isActive: t.id === template.id
    }))
    
    // Save to localStorage for persistence
    localStorage.setItem('landing-page-templates', JSON.stringify(updatedTemplates))
    
    // Show success message
    console.log(`Theme changed to: ${template.name}`)
  }

  const handleSaveSettings = async () => {
    setIsLoading(true)
    try {
      // Save settings to localStorage or API
      localStorage.setItem('admin-settings', JSON.stringify(savedSettings))
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      console.log('Settings saved successfully')
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetSettings = () => {
    setSavedSettings({
      defaultTheme: 'classic',
      enableAnalytics: true,
      enableNotifications: true,
      enableAuditLogs: true,
      maintenanceMode: false
    })
    localStorage.removeItem('admin-settings')
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'modern': return <Palette className="w-5 h-5" />
      case 'classic': return <Monitor className="w-5 h-5" />
      case 'minimal': return <Smartphone className="w-5 h-5" />
      case 'enterprise': return <Globe className="w-5 h-5" />
      default: return <Palette className="w-5 h-5" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'modern': return 'from-purple-500 to-blue-500'
      case 'classic': return 'from-gray-600 to-gray-800'
      case 'minimal': return 'from-green-500 to-teal-500'
      case 'enterprise': return 'from-blue-600 to-indigo-600'
      default: return 'from-gray-500 to-gray-600'
    }
  }

  return (
    <div className="container mx-auto px-6 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">System Administration</h1>
        <p className="text-gray-600">Manage system-wide settings, themes, and configurations</p>
      </div>

      <Tabs defaultValue="themes" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="themes" className="flex items-center space-x-2">
            <Palette className="w-4 h-4" />
            <span>Themes</span>
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span>General</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center space-x-2">
            <Shield className="w-4 h-4" />
            <span>Security</span>
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="flex items-center space-x-2">
            <Bell className="w-4 h-4" />
            <span>Monitoring</span>
          </TabsTrigger>
        </TabsList>

        {/* Themes Tab */}
        <TabsContent value="themes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Palette className="w-5 h-5" />
                <span>Landing Page Themes</span>
              </CardTitle>
              <CardDescription>
                Manage the visual appearance of your landing pages. Users can switch between available themes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Active Theme */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-blue-900">Current Active Theme</h3>
                    <p className="text-blue-700 text-sm">{activeTemplate.name}</p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800 border-blue-300">
                    Active
                  </Badge>
                </div>
              </div>

              {/* Theme Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {LANDING_PAGE_TEMPLATES.map((template) => (
                  <Card 
                    key={template.id}
                    className={`cursor-pointer transition-all hover:shadow-lg ${
                      template.id === activeTemplate.id 
                        ? 'ring-2 ring-blue-500 bg-blue-50' 
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => handleThemeChange(template)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${getCategoryColor(template.category)} flex items-center justify-center`}>
                          {getCategoryIcon(template.category)}
                        </div>
                        <div className="flex items-center space-x-2">
                          {template.isActive && (
                            <Badge className="bg-green-100 text-green-800 border-green-300">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Active
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {template.category}
                          </Badge>
                        </div>
                      </div>

                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        {template.name}
                      </h3>
                      
                      <p className="text-gray-600 text-sm mb-4">
                        {template.description}
                      </p>

                      {/* Features */}
                      <div className="space-y-2 mb-4">
                        {template.features.map((feature, index) => (
                          <div key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                            <span>{feature}</span>
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between">
                        <Button
                          variant={template.id === activeTemplate.id ? "default" : "outline"}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleThemeChange(template)
                          }}
                          className="flex-1 mr-2"
                        >
                          {template.id === activeTemplate.id ? 'Currently Active' : 'Activate Theme'}
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            window.open(template.path, '_blank')
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Preview
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Theme Management Info */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-semibold text-gray-900 mb-2">Theme Management</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Users can switch between available themes using the theme switcher</li>
                  <li>• Only active themes are visible to end users</li>
                  <li>• Theme changes take effect immediately</li>
                  <li>• Each theme maintains consistent content while changing visual design</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* General Settings Tab */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>General System Settings</span>
              </CardTitle>
              <CardDescription>
                Configure basic system behavior and default settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Landing Theme
                  </label>
                  <select 
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={savedSettings.defaultTheme}
                    onChange={(e) => setSavedSettings(prev => ({ ...prev, defaultTheme: e.target.value }))}
                  >
                    {LANDING_PAGE_TEMPLATES.filter(t => t.isActive).map(template => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    System Currency
                  </label>
                  <select className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="GHS">Ghanaian Cedi (₵)</option>
                    <option value="NGN">Nigerian Naira (₦)</option>
                    <option value="USD">US Dollar ($)</option>
                    <option value="EUR">Euro (€)</option>
                  </select>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">Enable Analytics</h4>
                    <p className="text-sm text-gray-600">Collect usage statistics and performance metrics</p>
                  </div>
                  <Button
                    variant={savedSettings.enableAnalytics ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSavedSettings(prev => ({ ...prev, enableAnalytics: !prev.enableAnalytics }))}
                  >
                    {savedSettings.enableAnalytics ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">Enable Notifications</h4>
                    <p className="text-sm text-gray-600">Send system notifications to users</p>
                  </div>
                  <Button
                    variant={savedSettings.enableNotifications ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSavedSettings(prev => ({ ...prev, enableNotifications: !prev.enableNotifications }))}
                  >
                    {savedSettings.enableNotifications ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">Maintenance Mode</h4>
                    <p className="text-sm text-gray-600">Temporarily disable system access for maintenance</p>
                  </div>
                  <Button
                    variant={savedSettings.maintenanceMode ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => setSavedSettings(prev => ({ ...prev, maintenanceMode: !prev.maintenanceMode }))}
                  >
                    {savedSettings.maintenanceMode ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>Security Settings</span>
              </CardTitle>
              <CardDescription>
                Configure security policies and authentication settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Session Timeout (minutes)
                  </label>
                  <input 
                    type="number" 
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue="1440"
                    min="15"
                    max="10080"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Login Attempts
                  </label>
                  <input 
                    type="number" 
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    defaultValue="5"
                    min="3"
                    max="10"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">Enable Audit Logs</h4>
                    <p className="text-sm text-gray-600">Log all system activities for security monitoring</p>
                  </div>
                  <Button
                    variant={savedSettings.enableAuditLogs ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSavedSettings(prev => ({ ...prev, enableAuditLogs: !prev.enableAuditLogs }))}
                  >
                    {savedSettings.enableAuditLogs ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">Two-Factor Authentication</h4>
                    <p className="text-sm text-gray-600">Require 2FA for admin accounts</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Configure
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Bell className="w-5 h-5" />
                <span>System Monitoring</span>
              </CardTitle>
              <CardDescription>
                Monitor system health and performance metrics
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-800">System Status</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900 mt-2">Healthy</p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium text-blue-800">Active Users</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900 mt-2">24</p>
                </div>

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <span className="text-sm font-medium text-purple-800">Uptime</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-900 mt-2">99.9%</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Recent System Events</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-gray-700">System backup completed successfully</span>
                    </div>
                    <span className="text-xs text-gray-500">2 minutes ago</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span className="text-sm text-gray-700">New user registration: john@example.com</span>
                    </div>
                    <span className="text-xs text-gray-500">15 minutes ago</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CreditCard className="w-4 h-4 text-purple-600" />
                      <span className="text-sm text-gray-700">Payment processed: ₵500.00</span>
                    </div>
                    <span className="text-xs text-gray-500">1 hour ago</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
        <Button
          variant="outline"
          onClick={handleResetSettings}
          className="flex items-center space-x-2"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Reset to Defaults</span>
        </Button>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            onClick={() => window.history.back()}
          >
            Cancel
          </Button>
          
          <Button
            onClick={handleSaveSettings}
            disabled={isLoading}
            className="flex items-center space-x-2"
          >
            <Save className="w-4 h-4" />
            <span>{isLoading ? 'Saving...' : 'Save Settings'}</span>
          </Button>
        </div>
      </div>
    </div>
  )
} 