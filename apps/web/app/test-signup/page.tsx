/**
 * Test Page for CalvaryPay Signup Implementation
 * This page tests all the signup functionality and components
 */

'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormField, FormSection, FormProgress } from '@/components/ui/form-field'
import { signUpSchema, validateField, type SignUpFormData } from '@/lib/validation-simple'
import { authService } from '@/lib/services/auth.service'
import { CreditCard, CheckCircle, AlertCircle, Info } from 'lucide-react'

// Simple Alert component for testing
function Alert({ type, title, message }: { type: string; title: string; message: string }) {
  const getIcon = () => {
    switch (type) {
      case 'info':
        return <Info className="w-5 h-5 text-blue-400" />
      default:
        return <Info className="w-5 h-5 text-blue-400" />
    }
  }

  return (
    <div className="p-4 rounded-lg border bg-blue-500/10 border-blue-500/20">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-white">{title}</h4>
          <p className="text-xs text-slate-300 mt-1">{message}</p>
        </div>
      </div>
    </div>
  )
}

export default function TestSignupPage() {
  const [formData, setFormData] = useState<SignUpFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'customer',
    acceptTerms: false,
  })
  
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [fieldValidation, setFieldValidation] = useState<Record<string, { isValid: boolean; isValidating: boolean }>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [testResults, setTestResults] = useState<string[]>([])

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`])
  }

  const validateFormField = (field: keyof SignUpFormData, value: any) => {
    setFieldValidation(prev => ({ ...prev, [field]: { ...prev[field], isValidating: true } }))
    
    setTimeout(() => {
      let fieldSchema
      switch (field) {
        case 'firstName':
        case 'lastName':
        case 'email':
        case 'phone':
        case 'password':
        case 'role':
          // Simple validation for testing
          const result = value && String(value).trim().length > 0
            ? { isValid: true }
            : { isValid: false, error: `${field} is required` }
          setFieldErrors(prev => ({ ...prev, [field]: result.error || '' }))
          setFieldValidation(prev => ({
            ...prev,
            [field]: { isValid: result.isValid, isValidating: false }
          }))
          return
        case 'confirmPassword':
          const confirmResult = value === formData.password
            ? { isValid: true }
            : { isValid: false, error: 'Passwords do not match' }
          setFieldErrors(prev => ({ ...prev, [field]: confirmResult.error || '' }))
          setFieldValidation(prev => ({
            ...prev,
            [field]: { isValid: confirmResult.isValid, isValidating: false }
          }))
          return
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

  const handleFieldChange = (field: keyof SignUpFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    validateFormField(field, value)
    addTestResult(`Field ${field} changed to: ${value}`)
  }

  const testValidation = () => {
    addTestResult('Testing validation schema...')
    
    const testData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+233123456789',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      role: 'customer' as const,
      acceptTerms: true,
    }

    const result = signUpSchema.safeParse(testData)
    if (result.success) {
      addTestResult('✅ Validation test passed')
    } else {
      addTestResult('❌ Validation test failed: ' + result.error.errors[0]?.message)
    }
  }

  const testApiCall = async () => {
    addTestResult('Testing API call...')
    setIsLoading(true)

    try {
      const testData = {
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        phone: '+233987654321',
        password: 'TestPassword123!',
        role: 'customer' as const,
      }

      const response = await authService.register(testData)
      addTestResult('✅ API call successful: ' + JSON.stringify(response.user))
    } catch (error: any) {
      addTestResult('❌ API call failed: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const fillTestData = () => {
    const testData = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@calvarypay.com',
      phone: '+233123456789',
      password: 'Password123!',
      confirmPassword: 'Password123!',
      role: 'customer' as const,
      acceptTerms: true,
    }

    setFormData(testData)
    addTestResult('✅ Test data filled')
  }

  const clearForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
      role: 'customer',
      acceptTerms: false,
    })
    setFieldErrors({})
    setFieldValidation({})
    addTestResult('🧹 Form cleared')
  }

  const progress = Object.keys(formData).filter(key => {
    const value = formData[key as keyof SignUpFormData]
    return value !== '' && value !== false
  }).length / Object.keys(formData).length * 100

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">CalvaryPay Signup Test</span>
          </div>
          <p className="text-slate-400">Testing comprehensive signup functionality</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Test Form */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Signup Form Test</CardTitle>
              <CardDescription className="text-slate-400">
                Test the enhanced signup form with real-time validation
              </CardDescription>
              <FormProgress progress={progress} className="mt-4" />
            </CardHeader>
            <CardContent className="space-y-6">
              <FormSection title="Personal Information">
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
                    inputClassName="bg-slate-700/50 border-slate-600 text-white"
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
                    inputClassName="bg-slate-700/50 border-slate-600 text-white"
                  />
                </div>
              </FormSection>

              <FormSection title="Contact Information">
                <FormField
                  label="Email"
                  name="email"
                  type="email"
                  placeholder="john.doe@example.com"
                  value={formData.email}
                  onChange={(value) => handleFieldChange('email', value)}
                  error={fieldErrors.email}
                  isValidating={fieldValidation.email?.isValidating}
                  isValid={fieldValidation.email?.isValid}
                  required
                  inputClassName="bg-slate-700/50 border-slate-600 text-white"
                />
                <FormField
                  label="Phone"
                  name="phone"
                  type="tel"
                  placeholder="+233 123 456 789"
                  value={formData.phone}
                  onChange={(value) => handleFieldChange('phone', value)}
                  error={fieldErrors.phone}
                  isValidating={fieldValidation.phone?.isValidating}
                  isValid={fieldValidation.phone?.isValid}
                  required
                  inputClassName="bg-slate-700/50 border-slate-600 text-white"
                />
              </FormSection>

              <FormSection title="Security">
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
                  inputClassName="bg-slate-700/50 border-slate-600 text-white"
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
                  inputClassName="bg-slate-700/50 border-slate-600 text-white"
                />
              </FormSection>

              <div className="flex flex-wrap gap-2">
                <Button onClick={fillTestData} variant="outline" size="sm">
                  Fill Test Data
                </Button>
                <Button onClick={clearForm} variant="outline" size="sm">
                  Clear Form
                </Button>
                <Button onClick={testValidation} variant="outline" size="sm">
                  Test Validation
                </Button>
                <Button onClick={testApiCall} disabled={isLoading} size="sm">
                  {isLoading ? 'Testing...' : 'Test API'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Test Results */}
          <Card className="bg-slate-900/50 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Test Results</CardTitle>
              <CardDescription className="text-slate-400">
                Real-time test results and logs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert
                  type="info"
                  title="Test Status"
                  message="All components loaded successfully. Ready for testing."
                />
                
                <div className="bg-slate-800/50 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <h4 className="text-white font-medium mb-2">Activity Log</h4>
                  <div className="space-y-1 text-xs font-mono">
                    {testResults.length === 0 ? (
                      <p className="text-slate-400">No activity yet...</p>
                    ) : (
                      testResults.map((result, index) => (
                        <div key={index} className="text-slate-300">
                          {result}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-slate-800/30 p-3 rounded">
                    <h5 className="text-white font-medium">Form Progress</h5>
                    <p className="text-slate-400">{Math.round(progress)}% complete</p>
                  </div>
                  <div className="bg-slate-800/30 p-3 rounded">
                    <h5 className="text-white font-medium">Validation Status</h5>
                    <p className="text-slate-400">
                      {Object.keys(fieldErrors).length === 0 ? 'No errors' : `${Object.keys(fieldErrors).length} errors`}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
