"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAtom } from "jotai"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { FormField, FormSection } from "@/components/ui/form-field"
import { CreditCard, Eye, EyeOff, Building2, User, Shield, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import Link from "next/link"
import { authService } from "@/lib/services/auth.service"
import { setUserAtom, setLoginLoadingAtom } from "@/lib/store/auth.store"
import { useSuccessNotification, useErrorNotification } from "@/components/ui/notification-system"
import { signUpSchema, validateField, type SignUpFormData } from "@/lib/validation-simple"

export default function SignUpPage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<SignUpFormData>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    role: "customer",
    acceptTerms: false,
  })
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [fieldValidation, setFieldValidation] = useState<Record<string, { isValid: boolean; isValidating: boolean }>>({})
  const [hasSubmitted, setHasSubmitted] = useState(false)

  // Atoms and notifications
  const [, setUser] = useAtom(setUserAtom)
  const [, setLoginLoading] = useAtom(setLoginLoadingAtom)
  const showSuccess = useSuccessNotification()
  const showError = useErrorNotification()

  // Real-time field validation with proper email validation
  const validateFormField = (field: keyof SignUpFormData, value: any) => {
    setFieldValidation(prev => ({ ...prev, [field]: { ...prev[field], isValidating: true } }))

    setTimeout(() => {
      let result: { isValid: boolean; error?: string }

      switch (field) {
        case 'firstName':
        case 'lastName':
          // Name validation with regex
          if (!value || String(value).trim().length === 0) {
            result = { isValid: false, error: `${field === 'firstName' ? 'First name' : 'Last name'} is required` }
          } else if (String(value).length < 2) {
            result = { isValid: false, error: `${field === 'firstName' ? 'First name' : 'Last name'} must be at least 2 characters` }
          } else if (!/^[a-zA-Z\s\-']+$/.test(String(value))) {
            result = { isValid: false, error: `${field === 'firstName' ? 'First name' : 'Last name'} can only contain letters, spaces, hyphens, and apostrophes` }
          } else {
            result = { isValid: true }
          }
          break

        case 'email':
          // Comprehensive email validation
          if (!value || String(value).trim().length === 0) {
            result = { isValid: false, error: 'Email is required' }
          } else {
            const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
            if (!emailRegex.test(String(value))) {
              result = { isValid: false, error: 'Please enter a valid email address (e.g., user@domain.com)' }
            } else if (String(value).length > 254) {
              result = { isValid: false, error: 'Email address is too long' }
            } else {
              result = { isValid: true }
            }
          }
          break

        case 'phone':
          // Ghana phone number validation
          if (!value || String(value).trim().length === 0) {
            result = { isValid: false, error: 'Phone number is required' }
          } else if (!/^(\+233|0)[2-9]\d{8}$/.test(String(value))) {
            result = { isValid: false, error: 'Please enter a valid Ghana phone number (e.g., +233245123456 or 0245123456)' }
          } else {
            result = { isValid: true }
          }
          break

        case 'password':
          // Strong password validation
          if (!value || String(value).trim().length === 0) {
            result = { isValid: false, error: 'Password is required' }
          } else if (String(value).length < 8) {
            result = { isValid: false, error: 'Password must be at least 8 characters' }
          } else if (!/[A-Z]/.test(String(value))) {
            result = { isValid: false, error: 'Password must contain at least one uppercase letter' }
          } else if (!/[a-z]/.test(String(value))) {
            result = { isValid: false, error: 'Password must contain at least one lowercase letter' }
          } else if (!/[0-9]/.test(String(value))) {
            result = { isValid: false, error: 'Password must contain at least one number' }
          } else {
            result = { isValid: true }
          }
          break

        case 'confirmPassword':
          // For confirm password, validate against the actual password
          if (value === formData.password) {
            result = { isValid: true }
          } else {
            result = { isValid: false, error: 'Passwords do not match' }
          }
          break

        case 'role':
          // For role, just check if it's selected
          if (value && ['customer', 'employee', 'merchant', 'admin'].includes(String(value))) {
            result = { isValid: true }
          } else {
            result = { isValid: false, error: 'Please select an account type' }
          }
          break

        case 'acceptTerms':
          // For accept terms, just check if it's true
          if (value === true) {
            result = { isValid: true }
          } else {
            result = { isValid: false, error: 'You must accept the terms and conditions' }
          }
          break

        default:
          result = { isValid: true }
          break
      }

      setFieldErrors(prev => ({ ...prev, [field]: result.error || '' }))
      setFieldValidation(prev => ({
        ...prev,
        [field]: { isValid: result.isValid, isValidating: false }
      }))
    }, 300)
  }

  const validateForm = () => {
    const result = signUpSchema.safeParse(formData)
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
    setIsLoading(true)

    console.log('🔥 Signup form submitted!', { formData })

    if (!validateForm()) {
      console.log('❌ Form validation failed')
      showError('Please fix the errors in the form')
      setIsLoading(false)
      return
    }

    try {
      console.log('✅ Form validation passed, attempting registration')

      const response = await authService.register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        role: formData.role,
        acceptTerms: formData.acceptTerms,
      })

      console.log('✅ Registration successful:', response)

      if (response?.user) {
        setUser(response.user)
        showSuccess('Account created successfully!', 'Welcome to CalvaryPay')

        // Route to appropriate dashboard based on role
        const dashboardRoutes = {
          customer: '/dashboard/customer',
          employee: '/dashboard/employee',
          merchant: '/dashboard/company',
          admin: '/dashboard/admin',
        }

        const route = dashboardRoutes[formData.role] || '/dashboard/customer'
        console.log(`🚀 Redirecting to ${route} for role: ${formData.role}`)
        router.push(route)
      }
    } catch (error: any) {
      console.error('❌ Registration error:', error)
      const errorMessage = error?.message || error?.response?.data?.error?.message || "Registration failed. Please try again."
      showError('Registration Failed', errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  // Field change handlers with real-time validation
  const handleFieldChange = (field: keyof SignUpFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    validateFormField(field, value)
  }

  const userTypes = [
    { value: "customer", label: "Customer", icon: User, description: "Individual user account" },
    { value: "employee", label: "Employee", icon: User, description: "Company employee account" },
    { value: "merchant", label: "Merchant", icon: Building2, description: "Business account" },
    { value: "admin", label: "Administrator", icon: Shield, description: "System administrator" },
  ]

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return "Personal Information"
      case 2: return "Account Details"
      case 3: return "Account Type & Terms"
      default: return "Sign Up"
    }
  }

  const canProceedToNextStep = () => {
    switch (currentStep) {
      case 1:
        return formData.firstName && formData.lastName &&
               !fieldErrors.firstName && !fieldErrors.lastName
      case 2:
        return formData.email && formData.phone &&
               !fieldErrors.email && !fieldErrors.phone
      case 3:
        return formData.password && formData.confirmPassword &&
               !fieldErrors.password && !fieldErrors.confirmPassword
      default:
        return false
    }
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
            <CardTitle className="text-2xl font-bold text-gray-900">Create account</CardTitle>
            <CardDescription className="text-gray-600">
              Join CalvaryPay to start managing payments efficiently
            </CardDescription>

            {/* Progress Indicator */}
            <div className="flex items-center justify-center mt-6 space-x-2">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-200 ${
                    step <= currentStep
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {step <= currentStep ? <CheckCircle className="w-4 h-4" /> : step}
                  </div>
                  {step < 4 && (
                    <div className={`w-8 h-0.5 mx-1 transition-all duration-200 ${
                      step < currentStep ? 'bg-indigo-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>

            <p className="text-sm text-gray-500 mt-2">{getStepTitle()}</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step 1: Personal Information */}
              {currentStep === 1 && (
                <FormSection title="Personal Information" description="Tell us about yourself">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      label="First Name"
                      name="firstName"
                      type="text"
                      placeholder="John"
                      value={formData.firstName}
                      onChange={(value) => handleFieldChange('firstName', value)}
                      error={fieldErrors.firstName}
                      isValidating={fieldValidation.firstName?.isValidating}
                      isValid={fieldValidation.firstName?.isValid}
                      required
                      inputClassName="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                    />
                    <FormField
                      label="Last Name"
                      name="lastName"
                      type="text"
                      placeholder="Doe"
                      value={formData.lastName}
                      onChange={(value) => handleFieldChange('lastName', value)}
                      error={fieldErrors.lastName}
                      isValidating={fieldValidation.lastName?.isValidating}
                      isValid={fieldValidation.lastName?.isValid}
                      required
                      inputClassName="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                    />
                  </div>
                </FormSection>
              )}

              {/* Step 2: Contact Information */}
              {currentStep === 2 && (
                <FormSection title="Contact Information" description="How can we reach you?">
                  <FormField
                    label="Email Address"
                    name="email"
                    type="email"
                    placeholder="john.doe@example.com"
                    value={formData.email}
                    onChange={(value) => handleFieldChange('email', value)}
                    error={fieldErrors.email}
                    isValidating={fieldValidation.email?.isValidating}
                    isValid={fieldValidation.email?.isValid}
                    required
                    inputClassName="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                  />
                  <FormField
                    label="Phone Number"
                    name="phone"
                    type="tel"
                    placeholder="+233 123 456 789"
                    value={formData.phone}
                    onChange={(value) => handleFieldChange('phone', value)}
                    error={fieldErrors.phone}
                    isValidating={fieldValidation.phone?.isValidating}
                    isValid={fieldValidation.phone?.isValid}
                    required
                    inputClassName="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                    description="Include country code (e.g., +233 for Ghana)"
                  />
                </FormSection>
              )}

              {/* Step 3: Security */}
              {currentStep === 3 && (
                <FormSection title="Security" description="Create a secure password">
                  <FormField
                    label="Password"
                    name="password"
                    type="password"
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={(value) => handleFieldChange('password', value)}
                    error={fieldErrors.password}
                    isValidating={fieldValidation.password?.isValidating}
                    isValid={fieldValidation.password?.isValid}
                    required
                    inputClassName="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                    description="Must contain uppercase, lowercase, number, and special character"
                  />
                  <FormField
                    label="Confirm Password"
                    name="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(value) => handleFieldChange('confirmPassword', value)}
                    error={fieldErrors.confirmPassword}
                    isValidating={fieldValidation.confirmPassword?.isValidating}
                    isValid={fieldValidation.confirmPassword?.isValid}
                    required
                    inputClassName="bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
                  />
                </FormSection>
              )}

              {/* Step 4: Account Type & Terms */}
              {currentStep === 4 && (
                <FormSection title="Account Type" description="Choose your account type">
                  <div className="space-y-4">
                    <Label className="text-gray-900">Select Account Type</Label>
                    <div className="grid grid-cols-1 gap-3">
                      {userTypes.map((type) => {
                        const Icon = type.icon
                        return (
                          <div
                            key={type.value}
                            className={`p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                              formData.role === type.value
                                ? 'border-indigo-500 bg-indigo-50'
                                : 'border-gray-200 bg-white hover:border-gray-300'
                            }`}
                            onClick={() => handleFieldChange('role', type.value)}
                          >
                            <div className="flex items-center space-x-3">
                              <Icon className={`w-5 h-5 ${
                                formData.role === type.value ? 'text-indigo-600' : 'text-gray-500'
                              }`} />
                              <div className="flex-1">
                                <h4 className={`font-medium ${
                                  formData.role === type.value ? 'text-indigo-900' : 'text-gray-900'
                                }`}>
                                  {type.label}
                                </h4>
                                <p className="text-xs text-gray-500">{type.description}</p>
                              </div>
                              {formData.role === type.value && (
                                <CheckCircle className="w-5 h-5 text-indigo-600" />
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Terms and Conditions */}
                    <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <Checkbox
                        id="acceptTerms"
                        checked={formData.acceptTerms}
                        onCheckedChange={(checked) => handleFieldChange('acceptTerms', checked)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label htmlFor="acceptTerms" className="text-sm text-gray-700 cursor-pointer">
                          I agree to the{' '}
                          <Link href="/terms" className="text-indigo-600 hover:text-indigo-500 underline">
                            Terms of Service
                          </Link>{' '}
                          and{' '}
                          <Link href="/privacy" className="text-indigo-600 hover:text-indigo-500 underline">
                            Privacy Policy
                          </Link>
                        </Label>
                        {fieldErrors.acceptTerms && (
                          <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            {fieldErrors.acceptTerms}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </FormSection>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-6">
                {currentStep > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setCurrentStep(prev => prev - 1)}
                    className="border-gray-300 text-gray-700 hover:bg-gray-50 bg-white"
                  >
                    Previous
                  </Button>
                ) : (
                  <div></div>
                )}

                {currentStep < 4 ? (
                  <Button
                    type="button"
                    onClick={() => setCurrentStep(prev => prev + 1)}
                    disabled={!canProceedToNextStep()}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isLoading || !formData.acceptTerms}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4 mr-2" />
                        Create Account
                      </>
                    )}
                  </Button>
                )}
              </div>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Already have an account?{" "}
                <Link href="/auth/signin" className="text-indigo-600 hover:text-indigo-500 font-medium">
                  Sign in
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
