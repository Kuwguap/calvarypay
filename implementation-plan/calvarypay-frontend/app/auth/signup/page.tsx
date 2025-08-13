"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CreditCard, Eye, EyeOff, Building2, User, Shield } from "lucide-react"
import Link from "next/link"

export default function SignUpPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    userType: "",
    organizationName: "",
    phoneNumber: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle sign up logic here
    console.log("Sign up:", formData)
  }

  const userTypes = [
    { value: "employee", label: "Employee", icon: User },
    { value: "company", label: "Company", icon: Building2 },
    { value: "admin", label: "Administrator", icon: Shield },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-600 via-fuchsia-500 via-pink-400 to-amber-300 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center border border-white/30">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-white drop-shadow-sm">CalvaryPay</span>
          </div>
        </div>

        <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-slate-900">Create Account</CardTitle>
            <CardDescription className="text-slate-600">
              Join CalvaryPay to start managing payments efficiently
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-slate-700 font-medium">
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 focus:border-violet-500 focus:ring-violet-500/20"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-slate-700 font-medium">
                    Last Name
                  </Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 focus:border-violet-500 focus:ring-violet-500/20"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 font-medium">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john.doe@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 focus:border-violet-500 focus:ring-violet-500/20"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phoneNumber" className="text-slate-700 font-medium">
                  Phone Number
                </Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="+233 XX XXX XXXX"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 focus:border-violet-500 focus:ring-violet-500/20"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="userType" className="text-slate-700 font-medium">
                  Account Type
                </Label>
                <Select
                  value={formData.userType}
                  onValueChange={(value) => setFormData({ ...formData, userType: value })}
                >
                  <SelectTrigger className="bg-white border-slate-300 text-slate-900 focus:border-violet-500 focus:ring-violet-500/20">
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    {userTypes.map((type) => {
                      const Icon = type.icon
                      return (
                        <SelectItem key={type.value} value={type.value} className="text-slate-900 hover:bg-slate-50">
                          <div className="flex items-center space-x-2">
                            <Icon className="w-4 h-4" />
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              {(formData.userType === "company" || formData.userType === "admin") && (
                <div className="space-y-2">
                  <Label htmlFor="organizationName" className="text-slate-700 font-medium">
                    Organization Name
                  </Label>
                  <Input
                    id="organizationName"
                    type="text"
                    placeholder="Metro Mass Transit Ghana"
                    value={formData.organizationName}
                    onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                    className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 focus:border-violet-500 focus:ring-violet-500/20"
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 focus:border-violet-500 focus:ring-violet-500/20 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-700 font-medium">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 focus:border-violet-500 focus:ring-violet-500/20 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  id="terms"
                  type="checkbox"
                  className="w-4 h-4 text-violet-600 bg-white border-slate-300 rounded focus:ring-violet-500"
                  required
                />
                <Label htmlFor="terms" className="text-sm text-slate-600">
                  I agree to the{" "}
                  <Link href="/terms" className="text-violet-600 hover:text-violet-700 font-medium">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-violet-600 hover:text-violet-700 font-medium">
                    Privacy Policy
                  </Link>
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-lg transition-colors"
              >
                Create Account
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-slate-600">
                Already have an account?{" "}
                <Link href="/auth/signin" className="text-violet-600 hover:text-violet-700 font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Link href="/" className="text-white/80 hover:text-white text-sm font-medium">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
