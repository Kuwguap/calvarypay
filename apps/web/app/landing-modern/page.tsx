'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import LandingPageSwitcher from '@/components/landing-page-switcher'
import { 
  ArrowRight, 
  Search, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Activity,
  BarChart3,
  CreditCard,
  Shield,
  Zap,
  Globe,
  Smartphone,
  Building2,
  CheckCircle,
  Eye
} from 'lucide-react'

export default function ModernLandingPage() {
  const [email, setEmail] = useState('')

  const handleEmailSignup = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement email signup logic
    console.log('Email signup:', email)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <nav className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-8">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div className="text-2xl font-bold text-gray-900">CalvaryPay</div>
            <div className="hidden md:flex items-center space-x-6">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">
                Features
              </a>
              <a href="#benefits" className="text-gray-600 hover:text-gray-900 transition-colors">
                Benefits
              </a>
              <a href="#monitoring" className="text-gray-600 hover:text-gray-900 transition-colors">
                Monitoring
              </a>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/auth/signin" className="text-gray-600 hover:text-gray-900 transition-colors">
              Sign in
            </Link>
            <LandingPageSwitcher className="mr-2" />
            <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white">
              Contact sales
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500 via-orange-500 via-purple-600 to-blue-600"></div>
        <div className="relative max-w-7xl mx-auto px-6 py-24 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="text-white">
              <Badge className="bg-white/20 text-white border-white/30 mb-6">
                Centralized Payment Regulation System
              </Badge>
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight mb-6">
                Financial infrastructure to
                <br />
                <span className="text-blue-200">monitor your business</span>
              </h1>
              <p className="text-xl text-white/90 mb-8 leading-relaxed">
                A centralized system for governments and institutions to regulate payments, providing consistent
                transactional tracking and standardized charging rates across all sectors.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/auth/signup">
                  <Button size="lg" className="bg-white text-gray-900 hover:bg-gray-100 px-8 text-lg">
                    Start Free Trial
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/20 px-8 text-lg">
                  Watch Demo
                </Button>
              </div>
            </div>

            {/* Right Content - Dashboard Preview */}
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl p-6 transform rotate-3 hover:rotate-0 transition-transform duration-300">
                {/* Dashboard Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="ml-3 font-semibold text-gray-900">CALVARYPAY DASHBOARD</span>
                  </div>
                  <Search className="w-5 h-5 text-gray-400" />
                </div>

                {/* Payment Form */}
                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Metro Mass Transit - Fuel</div>
                      <div className="text-sm text-gray-500">₵2,450.00</div>
                    </div>
                  </div>
                  <Button className="w-full bg-gray-900 text-white hover:bg-gray-800">
                    <Smartphone className="w-4 h-4 mr-2" />
                    Process Payment
                  </Button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-900">₵15,230</div>
                    <div className="text-sm text-blue-700">Tax Collection</div>
                    <div className="flex items-center mt-2">
                      <TrendingUp className="w-4 h-4 text-blue-600 mr-1" />
                      <span className="text-xs text-blue-600">+12.5%</span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-900">₵8,750</div>
                    <div className="text-sm text-green-700">Transport Fees</div>
                    <div className="flex items-center mt-2">
                      <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                      <span className="text-xs text-green-600">+8.3%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Comprehensive Payment Management
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Replace manual tracking methods with automated, centralized payment regulation
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Transactional Tracking</h3>
                <p className="text-gray-600 mb-6">
                  Eliminate manual book-keeping for organizations like Metro Mass Transit Ghana. Track fuel purchases,
                  maintenance costs, and all operational expenses automatically.
                </p>
                <div className="flex items-center text-blue-600 font-medium">
                  Learn more
                  <ArrowRight className="ml-2 w-4 h-4" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-6">
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Tax Collection Integration</h3>
                <p className="text-gray-600 mb-6">
                  Seamlessly extend to tax collection systems with standardized rates, ensuring compliance and
                  eliminating price misalignments across sectors.
                </p>
                <div className="flex items-center text-green-600 font-medium">
                  Learn more
                  <ArrowRight className="ml-2 w-4 h-4" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-6">
                  <Building2 className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Standardized Charging</h3>
                <p className="text-gray-600 mb-6">
                  Address price misalignments in transport systems and other sectors with consistent, regulated charging
                  rates across all platforms.
                </p>
                <div className="flex items-center text-purple-600 font-medium">
                  Learn more
                  <ArrowRight className="ml-2 w-4 h-4" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Monitoring Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-purple-600/20 text-purple-600 border-purple-600/30">
                Centralized Monitoring
              </Badge>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">Complete Visibility Into Payment Activities</h2>
              <p className="text-xl text-gray-600 mb-8">
                Empower businesses with comprehensive tracking of member purchase activities and money movements through
                our centralized monitoring system.
              </p>

              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center mt-1">
                    <Eye className="w-3 h-3 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Real-time Transaction Monitoring</h4>
                    <p className="text-gray-600">Track all payment activities as they happen</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center mt-1">
                    <Users className="w-3 h-3 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Member Activity Tracking</h4>
                    <p className="text-gray-600">Monitor individual and group spending patterns</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center mt-1">
                    <BarChart3 className="w-3 h-3 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Comprehensive Reporting</h4>
                    <p className="text-gray-600">Generate detailed reports for compliance and analysis</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
                    <span className="text-gray-700">Metro Mass Transit - Fuel</span>
                    <span className="text-green-600 font-semibold">₵2,450.00</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
                    <span className="text-gray-700">Government Tax Collection</span>
                    <span className="text-blue-600 font-semibold">₵15,230.50</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
                    <span className="text-gray-700">Transport Standardization</span>
                    <span className="text-purple-600 font-semibold">₵8,750.25</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-4xl font-bold text-gray-900 mb-12 text-center">Why Choose CalvaryPay?</h2>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="text-left">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">For Government Institutions</h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <span>Centralized payment regulation and oversight</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <span>Automated tax collection and compliance</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                  <span>Standardized charging across all sectors</span>
                </li>
              </ul>
            </div>

            <div className="text-left">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">For Organizations</h3>
              <ul className="space-y-3 text-gray-600">
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <span>Replace manual tracking with automation</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <span>Real-time transaction monitoring</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                  <span>Comprehensive reporting and analytics</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-gray-900 to-gray-800">
        <div className="max-w-4xl mx-auto text-center px-6">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Transform Your Payment System?
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            Join governments and institutions already using CalvaryPay for centralized payment regulation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup">
              <Button size="lg" className="bg-white text-gray-900 hover:bg-gray-100 px-8 py-4 text-lg">
                Get Started Today
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-gray-900 px-8 py-4 text-lg">
              Contact sales
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="text-2xl font-bold text-white mb-4">CalvaryPay</div>
              <p className="text-gray-400 mb-4">
                Centralized payment regulation for governments and institutions.
              </p>
              <div className="flex space-x-4">
                <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                  <Building2 className="w-5 h-5" />
                </Link>
                <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                  <Globe className="w-5 h-5" />
                </Link>
                <Link href="#" className="text-gray-400 hover:text-white transition-colors">
                  <Smartphone className="w-5 h-5" />
                </Link>
              </div>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Product</h3>
              <ul className="space-y-2">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#benefits" className="hover:text-white transition-colors">Benefits</a></li>
                <li><a href="#monitoring" className="hover:text-white transition-colors">Monitoring</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li><Link href="#" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Contact</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Support</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><Link href="#" className="hover:text-white transition-colors">Privacy</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Terms</Link></li>
                <li><Link href="#" className="hover:text-white transition-colors">Security</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center">
            <p>&copy; 2025 CalvaryPay. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
} 