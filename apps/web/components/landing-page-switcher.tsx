'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Palette, 
  Eye, 
  CheckCircle, 
  ChevronDown,
  Globe,
  Smartphone,
  Monitor
} from 'lucide-react'
import { 
  LANDING_PAGE_TEMPLATES, 
  LandingPageTemplate,
  getActiveLandingPage 
} from '@/lib/config/landing-page.config'

interface LandingPageSwitcherProps {
  className?: string
  showPreview?: boolean
}

export default function LandingPageSwitcher({ className = '', showPreview = false }: LandingPageSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const [selectedTemplate, setSelectedTemplate] = useState<LandingPageTemplate>(getActiveLandingPage())

  const handleTemplateSelect = (template: LandingPageTemplate) => {
    setSelectedTemplate(template)
    setIsOpen(false)
    // Use Next.js router for navigation
    router.push(template.path)
  }

  const handlePreview = (template: LandingPageTemplate, e: React.MouseEvent) => {
    e.stopPropagation()
    window.open(template.path, '_blank')
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'modern': return <Palette className="w-4 h-4" />
      case 'classic': return <Monitor className="w-4 h-4" />
      case 'minimal': return <Smartphone className="w-4 h-4" />
      case 'enterprise': return <Globe className="w-4 h-4" />
      default: return <Palette className="w-4 h-4" />
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
    <div className={`relative ${className}`}>
      {/* Template Switcher Button */}
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 bg-white/10 border-white/30 text-white hover:bg-white/20"
      >
        <Palette className="w-4 h-4" />
        <span>Switch Theme</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
          <div className="p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Landing Page Theme</h3>
            
            <div className="space-y-3">
              {LANDING_PAGE_TEMPLATES.filter(t => t.isActive).map((template) => (
                <Card 
                  key={template.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    template.id === selectedTemplate.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                  onClick={() => handleTemplateSelect(template)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${getCategoryColor(template.category)} flex items-center justify-center`}>
                            {getCategoryIcon(template.category)}
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{template.name}</h4>
                            <Badge className={`bg-gradient-to-r ${getCategoryColor(template.category)} text-white text-xs`}>
                              {template.category}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{template.description}</p>
                        
                        {/* Features Preview */}
                        <div className="flex flex-wrap gap-1">
                          {template.features.slice(0, 2).map((feature, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                          {template.features.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{template.features.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end space-y-2">
                        {template.isActive && (
                          <div className="flex items-center text-green-600 text-sm">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Active
                          </div>
                        )}
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={(e) => handlePreview(template, e)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Preview
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Footer */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Current: {selectedTemplate.name}</span>
                <span className="text-blue-600 hover:text-blue-700 cursor-pointer">
                  Admin Settings
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
} 