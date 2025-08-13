import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Shield, BarChart3, Users, CreditCard, Building2, Eye, ChevronDown } from "lucide-react"
import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-semibold text-gray-900">CalvaryPay</span>
          </div>
          <nav className="hidden lg:flex items-center space-x-8">
            <div className="flex items-center space-x-1 text-gray-700 hover:text-gray-900 cursor-pointer">
              <span>Products</span>
              <ChevronDown className="w-4 h-4" />
            </div>
            <div className="flex items-center space-x-1 text-gray-700 hover:text-gray-900 cursor-pointer">
              <span>Solutions</span>
              <ChevronDown className="w-4 h-4" />
            </div>
            <a href="#monitoring" className="text-gray-700 hover:text-gray-900 transition-colors">
              Resources
            </a>
            <a href="#benefits" className="text-gray-700 hover:text-gray-900 transition-colors">
              Pricing
            </a>
          </nav>
          <div className="flex items-center space-x-4">
            <Link href="/auth/signin" className="text-gray-700 hover:text-gray-900 font-medium">
              Sign in →
            </Link>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-full font-medium">
              Contact sales
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-fuchsia-500 via-pink-400 to-amber-400"></div>

        <div className="relative container mx-auto px-6 py-24 lg:py-32">
          <div className="max-w-4xl">
            {/* Badge */}
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm text-white text-sm font-medium mb-8">
              Sessions 2025 • Watch on demand →
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl lg:text-7xl font-bold text-white mb-8 leading-tight">
              Financial
              <br />
              <span className="text-orange-300">infrastructure</span>
              <br />
              to grow <span className="text-yellow-200">your</span>
              <br />
              <span className="text-slate-900">revenue</span>
            </h1>

            {/* Subheading */}
            <p className="text-xl lg:text-2xl text-white/90 mb-12 max-w-2xl leading-relaxed">
              Join the millions of companies that use CalvaryPay to accept payments online and in person, embed
              financial services, power custom revenue models, and build a more profitable business.
            </p>

            {/* CTA */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center bg-white rounded-full p-1 pr-4">
                <input
                  type="email"
                  placeholder="Email address"
                  className="px-6 py-3 bg-transparent border-none outline-none text-gray-900 placeholder-gray-500 flex-1"
                />
                <Button className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-full font-medium">
                  Start now →
                </Button>
              </div>
            </div>
          </div>

          {/* Dashboard Mockup */}
          <div className="absolute right-0 top-1/2 transform -translate-y-1/2 hidden xl:block">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-96">
              {/* Payment Form Mockup */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Abstraction Magazine</span>
                  <span className="text-sm font-medium">$19 per month</span>
                </div>

                <div className="bg-black text-white p-3 rounded-lg text-center font-medium">Pay</div>

                <div className="text-center text-gray-500 text-sm">Or pay with card</div>

                <div className="space-y-3">
                  <input type="email" placeholder="Email" className="w-full p-3 border border-gray-300 rounded-lg" />
                  <input
                    type="text"
                    placeholder="Card information"
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" placeholder="MM / YY" className="p-3 border border-gray-300 rounded-lg" />
                    <input type="text" placeholder="CVC" className="p-3 border border-gray-300 rounded-lg" />
                  </div>
                  <input
                    type="text"
                    placeholder="Country or region"
                    className="w-full p-3 border border-gray-300 rounded-lg"
                  />
                  <input type="text" placeholder="ZIP" className="w-full p-3 border border-gray-300 rounded-lg" />
                </div>

                <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-medium">
                  Pay
                </Button>
              </div>
            </div>

            {/* Analytics Dashboard */}
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 mt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Today</h3>
                  <span className="text-sm text-gray-500">Yesterday</span>
                </div>

                <div className="space-y-2">
                  <div className="text-2xl font-bold text-gray-900">$3,528,198.72</div>
                  <div className="text-sm text-gray-500">2:00 PM</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Net volume from sales</div>
                    <div className="font-semibold text-green-600">$39,274.29</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">New customers</div>
                    <div className="font-semibold text-blue-600">37</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6 bg-gray-50">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-20">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">Comprehensive Payment Management</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Replace manual tracking methods with automated, centralized payment regulation for governments and
              institutions
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            <Card className="bg-white border-0 shadow-sm hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center mb-6">
                  <BarChart3 className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Transactional Tracking</h3>
                <p className="text-gray-600 leading-relaxed">
                  Eliminate manual book-keeping for organizations like Metro Mass Transit Ghana. Track fuel purchases,
                  maintenance costs, and all operational expenses automatically.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border-0 shadow-sm hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-6">
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Tax Collection Integration</h3>
                <p className="text-gray-600 leading-relaxed">
                  Seamlessly extend to tax collection systems with standardized rates, ensuring compliance and
                  eliminating price misalignments across sectors.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border-0 shadow-sm hover:shadow-lg transition-shadow">
              <CardContent className="p-8">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-6">
                  <Building2 className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Standardized Charging</h3>
                <p className="text-gray-600 leading-relaxed">
                  Address price misalignments in transport systems and other sectors with consistent, regulated charging
                  rates across all platforms.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Monitoring Section */}
      <section className="py-24 px-6">
        <div className="container mx-auto max-w-7xl">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <Badge className="mb-6 bg-purple-100 text-purple-700 border-0 px-4 py-2">Centralized Monitoring</Badge>
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">
                Complete visibility into payment activities
              </h2>
              <p className="text-xl text-gray-600 mb-10 leading-relaxed">
                Empower businesses with comprehensive tracking of member purchase activities and money movements through
                our centralized monitoring system.
              </p>

              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Eye className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Real-time Transaction Monitoring</h4>
                    <p className="text-gray-600">Track all payment activities as they happen</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Member Activity Tracking</h4>
                    <p className="text-gray-600">Monitor individual and group spending patterns</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <BarChart3 className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Comprehensive Reporting</h4>
                    <p className="text-gray-600">Generate detailed reports for compliance and analysis</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <Card className="bg-white shadow-xl border-0">
                <CardContent className="p-8">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <span className="text-gray-700 font-medium">Metro Mass Transit - Fuel</span>
                      <span className="text-green-600 font-semibold">₵2,450.00</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <span className="text-gray-700 font-medium">Government Tax Collection</span>
                      <span className="text-indigo-600 font-semibold">₵15,230.50</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                      <span className="text-gray-700 font-medium">Transport Standardization</span>
                      <span className="text-purple-600 font-semibold">₵8,750.25</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-24 px-6 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">Why choose CalvaryPay?</h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-8">For Government Institutions</h3>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                  <span className="text-gray-700">Centralized payment regulation and oversight</span>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                  <span className="text-gray-700">Automated tax collection and compliance</span>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                  <span className="text-gray-700">Standardized charging across all sectors</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-8">For Organizations</h3>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                  <span className="text-gray-700">Replace manual tracking with automation</span>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                  <span className="text-gray-700">Real-time transaction monitoring</span>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                  <span className="text-gray-700">Comprehensive reporting and analytics</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-6">Ready to transform your payment system?</h2>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            Join governments and institutions already using CalvaryPay for centralized payment regulation.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/signup">
              <Button
                size="lg"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 text-lg rounded-full font-medium"
              >
                Get started today
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              className="border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-4 text-lg rounded-full font-medium bg-transparent"
            >
              Contact sales
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-16 px-6">
        <div className="container mx-auto max-w-7xl">
          <div className="grid md:grid-cols-5 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-2 mb-6">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-semibold text-gray-900">CalvaryPay</span>
              </div>
              <p className="text-gray-600 max-w-md">
                Centralized payment regulation for governments and institutions. Transform your payment infrastructure
                today.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Products</h4>
              <ul className="space-y-3 text-gray-600">
                <li>
                  <a href="#features" className="hover:text-gray-900 transition-colors">
                    Payments
                  </a>
                </li>
                <li>
                  <a href="#benefits" className="hover:text-gray-900 transition-colors">
                    Billing
                  </a>
                </li>
                <li>
                  <a href="#monitoring" className="hover:text-gray-900 transition-colors">
                    Connect
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Use cases</h4>
              <ul className="space-y-3 text-gray-600">
                <li>
                  <a href="#" className="hover:text-gray-900 transition-colors">
                    Government
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-gray-900 transition-colors">
                    Transport
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-gray-900 transition-colors">
                    Enterprise
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Resources</h4>
              <ul className="space-y-3 text-gray-600">
                <li>
                  <a href="#" className="hover:text-gray-900 transition-colors">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-gray-900 transition-colors">
                    Support
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-gray-900 transition-colors">
                    Status
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-200 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-500">&copy; 2024 CalvaryPay. All rights reserved.</p>
            <div className="flex items-center space-x-6 mt-4 md:mt-0">
              <a href="#" className="text-gray-500 hover:text-gray-700">
                Privacy
              </a>
              <a href="#" className="text-gray-500 hover:text-gray-700">
                Terms
              </a>
              <a href="#" className="text-gray-500 hover:text-gray-700">
                Cookies
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
