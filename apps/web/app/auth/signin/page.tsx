"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAtom } from "jotai"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CreditCard, Eye, EyeOff, Loader2, AlertCircle, CheckCircle } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/hooks/use-auth"
import { showErrorNotificationAtom, showSuccessNotificationAtom } from "@/lib/store/app.store"
import { signInSchema, validateField, type SignInFormData } from "@/lib/validation-simple"
import { FormField } from "@/components/ui/form-field"

export default function SignInPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState<SignInFormData>({
    email: "test@calvarypay.com",
    password: "Test123!",
    rememberMe: false,
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [fieldValidation, setFieldValidation] = useState<Record<string, { isValid: boolean; isValidating: boolean }>>({})
  const [hasSubmitted, setHasSubmitted] = useState(false)

  // Auth hook
  const { login, isLoading, error } = useAuth()
  const [, showErrorNotification] = useAtom(showErrorNotificationAtom)
  const [, showSuccessNotification] = useAtom(showSuccessNotificationAtom)

  // Real-time field validation
  const validateFormField = (field: keyof SignInFormData, value: any) => {
    setFieldValidation(prev => ({ ...prev, [field]: { ...prev[field], isValidating: true } }))

    setTimeout(() => {
      let fieldSchema
      switch (field) {
        case 'email':
          fieldSchema = signInSchema.shape.email
          break
        case 'password':
          fieldSchema = signInSchema.shape.password
          break
        default:
          return
      }

      const result = validateField(fieldSchema, value)
      setFieldErrors(prev => ({ ...prev, [field]: result.error || '' }))
      setFieldValidation(prev => ({
        ...prev,
        [field]: { isValid: result.isValid, isValidating: false }
      }))
    }, 300)
  }

  const validateForm = () => {
    const result = signInSchema.safeParse(formData)
    if (!result.success) {
      const errors: Record<string, string> = {}
      result.error.errors.forEach((err) => {
        const path = err.path.join('.')
        errors[path] = err.message
      })
      setFieldErrors(errors)
      return false
    }
    setFieldErrors({})
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setHasSubmitted(true)

    console.log('🔥 Form submitted!', { formData });

    if (!validateForm()) {
      console.log('❌ Form validation failed');
      showErrorNotification('Please fix the errors in the form')
      return
    }

    console.log('✅ Form validation passed');

    try {
      console.log('🚀 Attempting login with:', { email: formData.email });

      const result = await login(formData.email, formData.password)

      console.log('✅ Login result:', result);

      if (result.success) {
        console.log('👤 Login successful:', result.user);
        showSuccessNotification(`Welcome back, ${result.user.firstName || result.user.email}!`)
        
        // The useAuth hook handles redirection automatically
        console.log('🏠 Redirect handled by useAuth hook');
      } else {
        console.log('❌ Login failed:', result.error);
        showErrorNotification(result.error || "Login failed. Please try again.", "Login Failed")
      }
    } catch (error: any) {
      console.error('💥 Login error in component:', error);
      const errorMessage = error?.message || "Login failed. Please try again."
      showErrorNotification(errorMessage, "Login Failed")
    }
  }

  // Field change handlers with real-time validation
  const handleEmailChange = (value: string | number) => {
    const stringValue = String(value)
    setFormData(prev => ({ ...prev, email: stringValue }))
    validateFormField('email', stringValue)
  }

  const handlePasswordChange = (value: string | number) => {
    const stringValue = String(value)
    setFormData(prev => ({ ...prev, password: stringValue }))
    validateFormField('password', stringValue)
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-semibold text-gray-900">CalvaryPay</span>
          </div>
        </div>

        <Card className="bg-white border border-gray-200 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900">Welcome back</CardTitle>
            <CardDescription className="text-gray-600">Sign in to your CalvaryPay account to continue</CardDescription>
            {error && (
              <div className="flex items-center gap-2 p-3 mt-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <span className="text-sm text-red-600">{error}</span>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <FormField
                label="Email Address"
                name="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleEmailChange}
                error={fieldErrors.email}
                isValidating={fieldValidation.email?.isValidating}
                isValid={fieldValidation.email?.isValid}
                autoComplete="email"
                required
                inputClassName="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
              />

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
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    className={`bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-blue-500 pr-10 ${
                      fieldErrors.password ? 'border-red-500 focus:border-red-500' :
                      fieldValidation.password?.isValid ? 'border-green-500' : ''
                    }`}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  {fieldValidation.password?.isValidating && (
                    <div className="absolute right-10 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                    </div>
                  )}
                  {fieldValidation.password?.isValid && !fieldErrors.password && (
                    <div className="absolute right-10 top-1/2 -translate-y-1/2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    </div>
                  )}
                </div>
                {fieldErrors.password && (
                  <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {fieldErrors.password}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <input
                    id="remember"
                    type="checkbox"
                    checked={formData.rememberMe}
                    onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <Label htmlFor="remember" className="text-sm text-gray-700">
                    Remember me
                  </Label>
                </div>
                <Link href="/auth/forgot-password" className="text-sm text-indigo-600 hover:text-indigo-500">
                  Forgot password?
                </Link>
              </div>

              <Button
                type="submit"
                disabled={isLoading || (hasSubmitted && Object.keys(fieldErrors).length > 0)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Sign In
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Don't have an account?{" "}
                <Link href="/auth/signup" className="text-indigo-600 hover:text-indigo-500 font-medium">
                  Sign up
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Link href="/" className="text-gray-500 hover:text-gray-700 text-sm">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
