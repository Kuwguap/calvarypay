# 🎨 Landing Page Template System

This document explains how to use and manage the new landing page template system in CalvaryPay.

## 📋 Overview

The system now supports multiple landing page templates, allowing system administrators to choose between different designs and easily switch between them without affecting the core functionality.

## 🚀 Available Templates

### 1. Classic CalvaryPay (Default)
- **Path**: `/`
- **Category**: Classic
- **Status**: ✅ Active
- **Description**: The original landing page design with traditional business aesthetics
- **Features**: Traditional business layout, familiar navigation, proven conversion design

### 2. Modern Stripe-Inspired
- **Path**: `/landing-modern`
- **Category**: Modern
- **Status**: ✅ Active
- **Description**: Contemporary design inspired by modern fintech platforms
- **Features**: Vibrant gradients, interactive dashboard preview, modern card-based layout

### 3. Minimal Clean (Coming Soon)
- **Path**: `/landing-minimal`
- **Category**: Minimal
- **Status**: 🚧 In Development
- **Description**: Ultra-clean, minimal design focusing on content and conversion

### 4. Enterprise Professional (Coming Soon)
- **Path**: `/landing-enterprise`
- **Category**: Enterprise
- **Status**: 🚧 In Development
- **Description**: Corporate-focused design for B2B and enterprise customers

## 🛠️ How to Use

### For System Administrators

#### 1. Access Template Management
Navigate to `/admin/landing-pages` to access the template management interface.

#### 2. Switch Active Template
- Use the toggle switches to activate/deactivate templates
- Only one template can be active at a time
- The system automatically redirects users to the active template

#### 3. Preview Templates
- Click the "Preview" button on any template to see it in action
- Templates open in new tabs for easy comparison

#### 4. Configure Templates
- Use the "Configure" button to customize template settings
- Modify colors, content, and layout options

### For Developers

#### 1. Create New Template
```typescript
// 1. Create a new page component
// apps/web/app/landing-[template-name]/page.tsx

// 2. Add to configuration
// lib/config/landing-page.config.ts
export const LANDING_PAGE_TEMPLATES: LandingPageTemplate[] = [
  // ... existing templates
  {
    id: 'your-template',
    name: 'Your Template Name',
    description: 'Description of your template',
    path: '/landing-your-template',
    features: ['Feature 1', 'Feature 2'],
    isActive: false,
    category: 'modern' // or 'classic', 'minimal', 'enterprise'
  }
]
```

#### 2. Template Structure
Each template should follow this structure:
```typescript
'use client'

import { /* your imports */ } from '@/components/ui/*'

export default function YourTemplateName() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      {/* Hero Section */}
      {/* Features Section */}
      {/* CTA Section */}
      {/* Footer */}
    </div>
  )
}
```

#### 3. Add Template Switcher
Include the template switcher in your template:
```typescript
import LandingPageSwitcher from '@/components/landing-page-switcher'

// In your navigation
<LandingPageSwitcher className="ml-4" />
```

## 🎯 Template Categories

### Classic
- Traditional business aesthetics
- Familiar navigation patterns
- High accessibility
- Proven conversion rates

### Modern
- Contemporary design trends
- Interactive elements
- Vibrant color schemes
- Mobile-first approach

### Minimal
- Clean typography focus
- Minimal color palette
- Content-first approach
- Fast loading design

### Enterprise
- Professional corporate look
- Trust indicators
- Enterprise features showcase
- Formal business aesthetics

## 🔧 Configuration

### Environment Variables
```bash
# Optional: Set default template
NEXT_PUBLIC_DEFAULT_LANDING_PAGE=modern
```

### Template Settings
Each template can have custom settings:
```typescript
interface TemplateSettings {
  colors: {
    primary: string
    secondary: string
    accent: string
  }
  layout: {
    navigation: 'top' | 'side' | 'minimal'
    hero: 'full' | 'split' | 'minimal'
    features: 'grid' | 'list' | 'carousel'
  }
  content: {
    showStats: boolean
    showTestimonials: boolean
    showPricing: boolean
  }
}
```

## 📱 Responsive Design

All templates are built with responsive design principles:
- **Mobile First**: Optimized for mobile devices
- **Tablet**: Adaptive layouts for medium screens
- **Desktop**: Full-featured desktop experience
- **Accessibility**: WCAG 2.1 AA compliant

## 🎨 Customization

### Colors
Use CSS custom properties for easy theming:
```css
:root {
  --primary-color: #3b82f6;
  --secondary-color: #1f2937;
  --accent-color: #8b5cf6;
}
```

### Typography
Consistent typography scale:
```css
.text-hero { font-size: 3.75rem; line-height: 1; }
.text-heading { font-size: 2.25rem; line-height: 1.2; }
.text-body { font-size: 1.125rem; line-height: 1.6; }
```

### Components
Reusable UI components from `@/components/ui/*`:
- Button, Card, Badge, Input
- Consistent styling and behavior
- Easy to customize and extend

## 📊 Analytics & Performance

### Metrics Tracked
- Template conversion rates
- User engagement metrics
- Load time performance
- A/B testing results

### Performance Optimization
- Lazy loading for images
- Code splitting by template
- Optimized bundle sizes
- CDN integration ready

## 🚀 Future Enhancements

### Planned Features
- [ ] A/B testing framework
- [ ] Template analytics dashboard
- [ ] Drag-and-drop template builder
- [ ] Custom CSS editor
- [ ] Template marketplace
- [ ] Multi-language support

### Integration Points
- [ ] CMS integration for content management
- [ ] Marketing automation tools
- [ ] Customer feedback collection
- [ ] SEO optimization tools

## 🐛 Troubleshooting

### Common Issues

#### Template Not Loading
1. Check if template is active in configuration
2. Verify file path exists
3. Check browser console for errors
4. Ensure all dependencies are installed

#### Styling Issues
1. Verify Tailwind CSS is properly configured
2. Check for CSS conflicts
3. Ensure responsive breakpoints are correct
4. Validate component imports

#### Performance Issues
1. Check bundle size with `npm run build`
2. Analyze with Lighthouse
3. Optimize images and assets
4. Review component rendering

### Debug Mode
Enable debug mode for development:
```typescript
// lib/config/landing-page.config.ts
export const DEBUG_MODE = process.env.NODE_ENV === 'development'
```

## 📚 Resources

### Documentation
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Radix UI Components](https://www.radix-ui.com/docs/primitives)

### Design Inspiration
- [Stripe](https://stripe.com)
- [Plaid](https://plaid.com)
- [Square](https://squareup.com)
- [Modern Fintech Design Trends](https://dribbble.com/tags/fintech)

### Tools
- [Figma](https://figma.com) - Design and prototyping
- [Storybook](https://storybook.js.org) - Component development
- [Lighthouse](https://developers.google.com/web/tools/lighthouse) - Performance testing

## 🤝 Contributing

### Guidelines
1. Follow the existing code style
2. Add proper TypeScript types
3. Include responsive design
4. Test across different devices
5. Update documentation

### Code Review
- All template changes require review
- Performance impact assessment
- Accessibility compliance check
- Cross-browser compatibility test

---

**Last Updated**: August 13, 2025
**Version**: 1.0.0
**Maintainer**: CalvaryPay Development Team 