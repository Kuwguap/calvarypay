'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { 
  Eye, 
  Settings, 
  Palette, 
  Globe, 
  CheckCircle, 
  XCircle,
  ArrowRight
} from 'lucide-react'
import { 
  LANDING_PAGE_TEMPLATES, 
  LandingPageTemplate,
  getActiveLandingPage 
} from '@/lib/config/landing-page.config'

export default function LandingPageManagement() {
  const [templates, setTemplates] = useState<LandingPageTemplate[]>(LANDING_PAGE_TEMPLATES)
  const [activeTemplate, setActiveTemplate] = useState<LandingPageTemplate>(getActiveLandingPage())

  const handleTemplateToggle = (templateId: string, isActive: boolean) => {
    if (isActive) {
      // Deactivate all other templates first
      setTemplates(prev => prev.map(t => ({ ...t, isActive: false })))
      // Activate the selected template
      setTemplates(prev => prev.map(t => t.id === templateId ? { ...t, isActive: true } : t))
      setActiveTemplate(templates.find(t => t.id === templateId)!)
    } else {
      // Don't allow deactivating the last active template
      const activeCount = templates.filter(t => t.isActive).length
      if (activeCount > 1) {
        setTemplates(prev => prev.map(t => t.id === templateId ? { ...t, isActive: false } : t))
      }
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'modern': return 'bg-gradient-to-r from-purple-500 to-blue-500'
      case 'classic': return 'bg-gradient-to-r from-gray-600 to-gray-800'
      case 'minimal': return 'bg-gradient-to-r from-green-500 to-teal-500'
      case 'enterprise': return 'bg-gradient-to-r from-blue-600 to-indigo-600'
      default: return 'bg-gray-500'
    }
  }

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? (
      <CheckCircle className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-gray-400" />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Landing Page Management</h1>
          <p className="text-gray-600">
            Manage and configure different landing page templates for your platform
          </p>
        </div>

        {/* Current Active Template */}
        <Card className="mb-8 border-2 border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center text-green-800">
              <CheckCircle className="w-6 h-6 mr-2" />
              Currently Active Template
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-green-900">{activeTemplate.name}</h3>
                <p className="text-green-700">{activeTemplate.description}</p>
                <div className="flex items-center mt-2">
                  <Badge className={`${getCategoryColor(activeTemplate.category)} text-white mr-2`}>
                    {activeTemplate.category}
                  </Badge>
                  <span className="text-sm text-green-600">Active since {new Date().toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex space-x-3">
                <Button variant="outline" className="border-green-300 text-green-700 hover:bg-green-100">
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
                <Button variant="outline" className="border-green-300 text-green-700 hover:bg-green-100">
                  <Settings className="w-4 h-4 mr-2" />
                  Configure
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Template Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <Card 
              key={template.id} 
              className={`transition-all duration-200 ${
                template.isActive 
                  ? 'ring-2 ring-green-500 shadow-lg' 
                  : 'hover:shadow-md'
              }`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="flex items-center text-lg">
                      {template.name}
                      {template.isActive && (
                        <Badge className="ml-2 bg-green-100 text-green-800 border-green-200">
                          Active
                        </Badge>
                      )}
                    </CardTitle>
                    <Badge className={`${getCategoryColor(template.category)} text-white mt-2`}>
                      {template.category}
                    </Badge>
                  </div>
                  <Switch
                    checked={template.isActive}
                    onCheckedChange={(checked) => handleTemplateToggle(template.id, checked)}
                    disabled={!template.isActive && templates.filter(t => t.isActive).length === 1}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm mb-4">{template.description}</p>
                
                {/* Features */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Key Features:</h4>
                  <ul className="space-y-1">
                    {template.features.slice(0, 3).map((feature, index) => (
                      <li key={index} className="text-xs text-gray-600 flex items-center">
                        <CheckCircle className="w-3 h-3 text-green-500 mr-2" />
                        {feature}
                      </li>
                    ))}
                    {template.features.length > 3 && (
                      <li className="text-xs text-gray-500">
                        +{template.features.length - 3} more features
                      </li>
                    )}
                  </ul>
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => window.open(template.path, '_blank')}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Preview
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    disabled={!template.isActive}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Configure
                  </Button>
                </div>

                {/* Status */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center">
                    {getStatusIcon(template.isActive)}
                    <span className={`ml-2 text-sm ${
                      template.isActive ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {template.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {template.isActive && (
                    <Button size="sm" className="bg-green-600 hover:bg-green-700">
                      <Globe className="w-4 h-4 mr-2" />
                      Live
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Button variant="outline">
                <Palette className="w-4 h-4 mr-2" />
                Create Custom Template
              </Button>
              <Button variant="outline">
                <Globe className="w-4 h-4 mr-2" />
                A/B Testing Setup
              </Button>
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Global Settings
              </Button>
              <Button variant="outline">
                <ArrowRight className="w-4 h-4 mr-2" />
                Export Templates
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Analytics Preview */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Template Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">2.4%</div>
                <div className="text-sm text-gray-600">Conversion Rate</div>
                <div className="text-xs text-green-600">+0.3% vs last month</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">45.2s</div>
                <div className="text-sm text-gray-600">Avg. Load Time</div>
                <div className="text-xs text-red-600">+2.1s vs last month</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">89.7%</div>
                <div className="text-sm text-gray-600">User Engagement</div>
                <div className="text-xs text-green-600">+1.2% vs last month</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">12.3K</div>
                <div className="text-sm text-gray-600">Monthly Visitors</div>
                <div className="text-xs text-green-600">+8.5% vs last month</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 