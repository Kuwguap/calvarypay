"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAtom } from "jotai"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CreditCard, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react"
import Link from "next/link"
import { authService } from "@/lib/services/auth.service"
import { setUserAtom, setLoginLoadingAtom, setAuthErrorAtom, loginLoadingAtom, authErrorAtom, dashboardRouteAtom } from "@/lib/store/auth.store"
import { showErrorNotificationAtom, showSuccessNotificationAtom } from "@/lib/store/app.store"

export default function SignInPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: "test@eliteepay.com",
    password: "Test123!",
    rememberMe: false,
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Atoms
  const [, setUser] = useAtom(setUserAtom)
  const [, setLoginLoading] = useAtom(setLoginLoadingAtom)
  const [, setAuthError] = useAtom(setAuthErrorAtom)
  const [loginLoading] = useAtom(loginLoadingAtom)
  const [authError] = useAtom(authErrorAtom)
  const [dashboardRoute] = useAtom(dashboardRouteAtom)
  const [, showErrorNotification] = useAtom(showErrorNotificationAtom)
  const [, showSuccessNotification] = useAtom(showSuccessNotificationAtom)

  const validateForm = () => {
    const errors: Record<string, string> = {}

    if (!formData.email) {
      errors.email = "Email is required"
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = "Please enter a valid email address"
    }

    if (!formData.password) {
      errors.password = "Password is required"
    } else if (formData.password.length < 8) {
      errors.password = "Password must be at least 8 characters"
    }

    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log('🔥 Form submitted!', { formData });

    if (!validateForm()) {
      console.log('❌ Form validation failed');
      return
    }

    console.log('✅ Form validation passed');
    setLoginLoading(true)
    setAuthError(null)

    try {
      console.log('🚀 Attempting login with:', { email: formData.email });
      console.log('🌐 API Base URL:', process.env.NEXT_PUBLIC_API_BASE_URL);

      const response = await authService.login({
        email: formData.email,
        password: formData.password,
      })

      console.log('✅ Login response received:', response);

      if (response?.user) {
        console.log('👤 User found in response:', response.user);
        setUser(response.user)
        showSuccessNotification(`Welcome back, ${response.user.firstName}!`)

        // Redirect to appropriate dashboard
        console.log('🏠 Redirecting to dashboard:', dashboardRoute);
        router.push(dashboardRoute)
      } else {
        console.log('❌ No user in response');
        throw new Error('Invalid response format')
      }
    } catch (error: any) {
      console.error('💥 Login error in component:', error);
      console.error('💥 Error details:', {
        code: error?.code,
        message: error?.message,
        statusCode: error?.statusCode,
        response: error?.response?.data
      });

      const errorMessage = error?.message || error?.response?.data?.error?.message || "Login failed. Please try again."
      console.log('📝 Setting error message:', errorMessage);
      setAuthError(errorMessage)
      showErrorNotification(errorMessage, "Login Failed")
    } finally {
      console.log('🏁 Login attempt finished');
      setLoginLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">EliteePay</span>
          </div>
        </div>

        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-white">Welcome Back</CardTitle>
            <CardDescription className="text-slate-300">Sign in to your EliteePay account to continue</CardDescription>
            {authError && (
              <div className="flex items-center gap-2 p-3 mt-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-sm text-red-400">{authError}</span>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-200">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500 ${
                    fieldErrors.email ? 'border-red-500 focus:border-red-500' : ''
                  }`}
                  required
                />
                {fieldErrors.email && (
                  <p className="text-sm text-red-400 mt-1">{fieldErrors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-200">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className={`bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500 pr-10 ${
                      fieldErrors.password ? 'border-red-500 focus:border-red-500' : ''
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <p className="text-sm text-red-400 mt-1">{fieldErrors.password}</p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <input
                    id="remember"
                    type="checkbox"
                    checked={formData.rememberMe}
                    onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                    className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
                  />
                  <Label htmlFor="remember" className="text-sm text-slate-300">
                    Remember me
                  </Label>
                </div>
                <Link href="/auth/forgot-password" className="text-sm text-blue-400 hover:text-blue-300">
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                disabled={loginLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loginLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-slate-300">
                Don't have an account?{" "}
                <Link href="/auth/signup" className="text-blue-400 hover:text-blue-300 font-medium">
                  Sign up
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Link href="/" className="text-slate-400 hover:text-slate-200 text-sm">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
