export interface LandingPageTemplate {
  id: string
  name: string
  description: string
  path: string
  features: string[]
  previewImage?: string
  isActive: boolean
  category: 'modern' | 'classic' | 'minimal' | 'enterprise'
}

export const LANDING_PAGE_TEMPLATES: LandingPageTemplate[] = [
  {
    id: 'classic',
    name: 'Classic CalvaryPay',
    description: 'The original landing page design with traditional business aesthetics',
    path: '/',
    features: [
      'Traditional business layout',
      'Familiar navigation structure',
      'Proven conversion design',
      'Accessible for all users'
    ],
    isActive: true,
    category: 'classic'
  },
  {
    id: 'modern',
    name: 'Modern Stripe-Inspired',
    description: 'Contemporary design inspired by modern fintech platforms with vibrant gradients',
    path: '/landing-modern',
    features: [
      'Vibrant gradient backgrounds',
      'Interactive dashboard preview',
      'Modern card-based layout',
      'Professional fintech aesthetics'
    ],
    isActive: true,
    category: 'modern'
  },
  {
    id: 'minimal',
    name: 'Minimal Clean',
    description: 'Ultra-clean, minimal design focusing on content and conversion',
    path: '/landing-minimal',
    features: [
      'Clean typography focus',
      'Minimal color palette',
      'Content-first approach',
      'Fast loading design'
    ],
    isActive: false, // Not implemented yet
    category: 'minimal'
  },
  {
    id: 'enterprise',
    name: 'Enterprise Professional',
    description: 'Corporate-focused design for B2B and enterprise customers',
    path: '/landing-enterprise',
    features: [
      'Professional corporate look',
      'Trust indicators',
      'Enterprise features showcase',
      'Formal business aesthetics'
    ],
    isActive: false, // Not implemented yet
    category: 'enterprise'
  }
]

export const getActiveLandingPage = (): LandingPageTemplate => {
  return LANDING_PAGE_TEMPLATES.find(template => template.isActive) || LANDING_PAGE_TEMPLATES[0]
}

export const getLandingPageById = (id: string): LandingPageTemplate | undefined => {
  return LANDING_PAGE_TEMPLATES.find(template => template.id === id)
}

export const getAllActiveTemplates = (): LandingPageTemplate[] => {
  return LANDING_PAGE_TEMPLATES.filter(template => template.isActive)
}

export const getTemplatesByCategory = (category: LandingPageTemplate['category']): LandingPageTemplate[] => {
  return LANDING_PAGE_TEMPLATES.filter(template => template.category === category)
} 