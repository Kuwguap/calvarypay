"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Users,
  Plus,
  Search,
  Filter,
  Mail,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  UserPlus,
  Eye,
  Settings,
  Send
} from "lucide-react"
import { MerchantLayout } from "@/components/dashboard/role-based-layout"
import { withRouteProtection } from "@/lib/auth/route-protection"
import { useAuth } from "@/lib/hooks/use-auth"
import { formatCurrency, formatDate } from "@/lib/utils"
import Link from "next/link"
import {
  validateEmployeeInvitationForm,
  validateEmployeeInvitationField,
  validateEmailSearch,
  commonDepartments,
  spendingLimitPresets,
  type EmployeeInvitationData
} from "@/lib/validation/employee-invitation"

// Types
interface Employee {
  id: string
  firstName: string
  lastName: string
  email: string
  status: string
  department?: string
  lastActive?: string
  joinedAt: string
  spendingLimit?: number
}

// Note: Department options are now imported from validation schema

function EmployeesPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  // State
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    department: "none",
    spendingLimit: ""
  })
  const [inviteErrors, setInviteErrors] = useState<Record<string, string>>({})
  const [emailSearchResults, setEmailSearchResults] = useState<any[]>([])
  const [isSearchingEmail, setIsSearchingEmail] = useState(false)
  const [showEmailSuggestions, setShowEmailSuggestions] = useState(false)
  const [showSuccessMessage, setShowSuccessMessage] = useState(false)

  // Fetch employees
  const {
    data: employeesData,
    isLoading: employeesLoading,
    error: employeesError,
    refetch: refetchEmployees
  } = useQuery({
    queryKey: ['merchant-employees', searchTerm, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      params.append('limit', '100')

      // Get token from user object or fallback to localStorage
      const token = user?.accessToken || (typeof window !== 'undefined' ? localStorage.getItem('calvarypay_access_token') : null);

      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`/api/merchant/employees?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch employees')
      }

      return response.json()
    },
    enabled: !!user?.accessToken,
    staleTime: 300000, // 5 minutes
  })

  // Invite employee mutation
  const inviteEmployeeMutation = useMutation({
    mutationFn: async (inviteData: any) => {
      console.log('🔍 Sending invitation with token:', {
        hasUser: !!user,
        hasAccessToken: !!user?.accessToken,
        tokenStart: user?.accessToken?.substring(0, 20) + '...',
        tokenLength: user?.accessToken?.length,
        userObject: user,
        localStorageToken: typeof window !== 'undefined' ? localStorage.getItem('calvarypay_access_token')?.substring(0, 20) + '...' : 'N/A'
      });

      // Get token from user object or fallback to localStorage
      const token = user?.accessToken || (typeof window !== 'undefined' ? localStorage.getItem('calvarypay_access_token') : null);

      if (!token) {
        throw new Error('No authentication token available. Please log in again.');
      }

      const response = await fetch('/api/merchant/employees', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(inviteData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error?.message || 'Failed to invite employee')
      }

      return response.json()
    },
    onSuccess: (data) => {
      // Reset form
      setInviteForm({
        email: "",
        firstName: "",
        lastName: "",
        department: "none",
        spendingLimit: ""
      })
      setInviteErrors({})
      setEmailSearchResults([])
      setShowEmailSuggestions(false)
      setIsInviteDialogOpen(false)

      // Show success message
      setShowSuccessMessage(true)
      setTimeout(() => setShowSuccessMessage(false), 5000) // Hide after 5 seconds
      console.log('✅ Employee invitation sent successfully:', data)

      // Refresh employees list
      queryClient.invalidateQueries({ queryKey: ['merchant-employees'] })
      queryClient.invalidateQueries({ queryKey: ['merchant-dashboard-stats'] })
    },
    onError: (error: unknown) => {
      console.error('Employee invitation failed:', error)
      // Handle error display if needed
      const errorMessage = error instanceof Error ? error.message : 'Failed to invite employee'
      console.error('Error message:', errorMessage)
    }
  })

  // Form validation using Zod schema
  const validateInviteForm = () => {
    const formData = {
      email: inviteForm.email,
      firstName: inviteForm.firstName,
      lastName: inviteForm.lastName,
      department: inviteForm.department,
      spendingLimit: inviteForm.spendingLimit
    }

    const { isValid, errors } = validateEmployeeInvitationForm(formData)
    setInviteErrors(errors)
    return isValid
  }

  // Real-time field validation
  const validateField = (field: string, value: string) => {
    if (field === 'email' && value.length >= 3) {
      const emailValidation = validateEmailSearch(value)
      if (!emailValidation.isValid) {
        setInviteErrors(prev => ({ ...prev, [field]: emailValidation.error || 'Invalid email' }))
        return false
      }
    }

    const validation = validateEmployeeInvitationField(field as keyof typeof validateEmployeeInvitationField, value)
    if (!validation.isValid) {
      setInviteErrors(prev => ({ ...prev, [field]: validation.error || 'Invalid input' }))
      return false
    } else {
      setInviteErrors(prev => ({ ...prev, [field]: '' }))
      return true
    }
  }

  // Handle invite submission
  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateInviteForm()) {
      return
    }

    const inviteData = {
      email: inviteForm.email.trim(),
      firstName: inviteForm.firstName.trim(),
      lastName: inviteForm.lastName.trim(),
      department: inviteForm.department === 'none' ? null : inviteForm.department,
      spendingLimit: inviteForm.spendingLimit ? parseFloat(inviteForm.spendingLimit) : null
    }

    inviteEmployeeMutation.mutate(inviteData)
  }

  // Search for users by email
  const searchUsersByEmail = async (email: string) => {
    if (!email || email.length < 3) {
      setEmailSearchResults([])
      setShowEmailSuggestions(false)
      return
    }

    console.log('🔍 Searching users with token:', {
      hasUser: !!user,
      hasAccessToken: !!user?.accessToken,
      tokenStart: user?.accessToken?.substring(0, 20) + '...',
      email
    });

    setIsSearchingEmail(true)
    try {
      // Get token from user object or fallback to localStorage
      const token = user?.accessToken || (typeof window !== 'undefined' ? localStorage.getItem('calvarypay_access_token') : null);

      if (!token) {
        console.error('No authentication token available for search');
        return;
      }

      const response = await fetch(`/api/merchant/search-users?email=${encodeURIComponent(email)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        setEmailSearchResults(data.users || [])
        setShowEmailSuggestions(true)
      }
    } catch (error) {
      console.error('Email search failed:', error)
    } finally {
      setIsSearchingEmail(false)
    }
  }

  // Handle selecting a user from search results
  const handleSelectUser = (user: any) => {
    setInviteForm(prev => ({
      ...prev,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName
    }))
    setShowEmailSuggestions(false)
    setEmailSearchResults([])
  }

  // Handle input changes with real-time validation
  const handleInviteInputChange = (field: string, value: string) => {
    setInviteForm(prev => ({ ...prev, [field]: value }))

    // Real-time validation with debouncing for better UX
    if (value.trim() !== '') {
      // Validate field after a short delay to avoid excessive validation
      setTimeout(() => {
        validateField(field, value)
      }, 300)
    } else {
      // Clear error when field is empty (except for required fields)
      if (field !== 'email' && field !== 'firstName' && field !== 'lastName') {
        setInviteErrors(prev => ({ ...prev, [field]: "" }))
      }
    }

    // Search for users when email changes
    if (field === 'email') {
      if (value.length >= 3) {
        const emailValidation = validateEmailSearch(value)
        if (emailValidation.isValid) {
          searchUsersByEmail(value)
        }
      } else {
        setEmailSearchResults([])
        setShowEmailSuggestions(false)
      }
    }
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
      case 'inactive':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
    }
  }

  const employees = employeesData?.employees || []

  return (
    <MerchantLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/dashboard/company">
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Employee Management</h1>
              <p className="text-slate-400">Manage your team members and send invitations</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchEmployees()}
              disabled={employeesLoading}
              className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${employeesLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite Employee
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-white">Invite New Employee</DialogTitle>
                  <DialogDescription className="text-slate-400">
                    Send an invitation to add a new team member
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleInviteSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-slate-300">First Name *</Label>
                      <Input
                        id="firstName"
                        placeholder="John"
                        value={inviteForm.firstName}
                        onChange={(e) => handleInviteInputChange('firstName', e.target.value)}
                        className={`bg-slate-800 border-slate-700 text-white ${
                          inviteErrors.firstName ? 'border-red-500' : 'focus:border-blue-500'
                        }`}
                        required
                      />
                      {inviteErrors.firstName && (
                        <p className="text-red-400 text-sm">{inviteErrors.firstName}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-slate-300">Last Name *</Label>
                      <Input
                        id="lastName"
                        placeholder="Doe"
                        value={inviteForm.lastName}
                        onChange={(e) => handleInviteInputChange('lastName', e.target.value)}
                        className={`bg-slate-800 border-slate-700 text-white ${
                          inviteErrors.lastName ? 'border-red-500' : 'focus:border-blue-500'
                        }`}
                        required
                      />
                      {inviteErrors.lastName && (
                        <p className="text-red-400 text-sm">{inviteErrors.lastName}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2 relative">
                    <Label htmlFor="email" className="text-slate-300">
                      Email Address *
                      {isSearchingEmail && (
                        <span className="ml-2 text-blue-400 text-sm">Searching...</span>
                      )}
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john.doe@company.com (start typing to search)"
                      value={inviteForm.email}
                      onChange={(e) => handleInviteInputChange('email', e.target.value)}
                      onFocus={() => {
                        if (emailSearchResults.length > 0) {
                          setShowEmailSuggestions(true)
                        }
                      }}
                      onBlur={() => {
                        // Delay hiding suggestions to allow clicking
                        setTimeout(() => setShowEmailSuggestions(false), 200)
                      }}
                      className={`bg-slate-800 border-slate-700 text-white ${
                        inviteErrors.email ? 'border-red-500' : 'focus:border-blue-500'
                      }`}
                      required
                    />

                    {/* Email Search Suggestions */}
                    {showEmailSuggestions && emailSearchResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-64 overflow-y-auto">
                        <div className="p-3 border-b border-slate-700">
                          <p className="text-slate-400 text-sm">
                            Found {emailSearchResults.length} employee(s)
                            {emailSearchResults.filter(u => u.canInvite).length > 0 && (
                              <span className="text-emerald-400 ml-1">
                                ({emailSearchResults.filter(u => u.canInvite).length} available)
                              </span>
                            )}
                          </p>
                        </div>
                        {emailSearchResults.map((user) => (
                          <div
                            key={user.id}
                            onClick={() => user.canInvite && handleSelectUser(user)}
                            className={`p-3 border-b border-slate-700 last:border-b-0 ${
                              user.canInvite
                                ? 'hover:bg-slate-700 cursor-pointer'
                                : 'cursor-not-allowed opacity-75'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="text-white font-medium">{user.name}</p>
                                <p className="text-slate-400 text-sm">{user.email}</p>
                                <p className="text-slate-500 text-xs mt-1">{user.statusMessage}</p>
                              </div>
                              <div className="flex items-center space-x-2">
                                {user.status === 'available' && (
                                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                    Available
                                  </Badge>
                                )}
                                {user.status === 'pending_invitation' && (
                                  <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                                    Pending
                                  </Badge>
                                )}
                                {user.status === 'already_member' && (
                                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                                    Team Member
                                  </Badge>
                                )}
                                {user.status === 'employed_elsewhere' && (
                                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                                    Unavailable
                                  </Badge>
                                )}
                                {user.status === 'invitation_accepted' && (
                                  <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                                    Accepted
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {emailSearchResults.length > 0 && emailSearchResults.filter(u => u.canInvite).length === 0 && (
                          <div className="p-3 text-center">
                            <p className="text-slate-400 text-sm">No available employees found</p>
                            <p className="text-slate-500 text-xs">All found users are currently unavailable for invitation</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* No Results State */}
                    {showEmailSuggestions && inviteForm.email.length >= 3 && emailSearchResults.length === 0 && !isSearchingEmail && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl">
                        <div className="p-4 text-center">
                          <p className="text-slate-400 text-sm">No employees found with this email</p>
                          <p className="text-slate-500 text-xs mt-1">
                            You can still send an invitation - they'll be able to join your organization
                          </p>
                        </div>
                      </div>
                    )}

                    {inviteErrors.email && (
                      <p className="text-red-400 text-sm">{inviteErrors.email}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="department" className="text-slate-300">Department</Label>
                    <Select value={inviteForm.department} onValueChange={(value) => handleInviteInputChange('department', value)}>
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue placeholder="Select department (optional)" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="none">No Department</SelectItem>
                        {commonDepartments.map((dept) => (
                          <SelectItem key={dept} value={dept} className="text-white hover:bg-slate-700">
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {inviteErrors.department && (
                      <p className="text-red-400 text-sm">{inviteErrors.department}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="spendingLimit" className="text-slate-300">Monthly Spending Limit (₵)</Label>
                    <div className="space-y-2">
                      <Input
                        id="spendingLimit"
                        type="number"
                        step="0.01"
                        placeholder="Enter custom amount or select preset below"
                        value={inviteForm.spendingLimit}
                        onChange={(e) => handleInviteInputChange('spendingLimit', e.target.value)}
                        className={`bg-slate-800 border-slate-700 text-white ${
                          inviteErrors.spendingLimit ? 'border-red-500' : 'focus:border-blue-500'
                        }`}
                      />
                      <div className="flex flex-wrap gap-2">
                        {spendingLimitPresets.map((preset) => (
                          <Button
                            key={preset.value}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleInviteInputChange('spendingLimit', preset.value.toString())}
                            className="bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600 hover:text-white text-xs"
                          >
                            {preset.label}
                          </Button>
                        ))}
                      </div>
                    </div>
                    {inviteErrors.spendingLimit && (
                      <p className="text-red-400 text-sm">{inviteErrors.spendingLimit}</p>
                    )}
                  </div>

                  {/* Error Alert */}
                  {inviteEmployeeMutation.error && (
                    <Alert className="bg-red-500/20 border-red-500/30">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-red-400">
                        {inviteEmployeeMutation.error.message}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="flex space-x-2 pt-4">
                    <Button
                      type="submit"
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      disabled={inviteEmployeeMutation.isPending}
                    >
                      {inviteEmployeeMutation.isPending ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Send Invitation
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-slate-600 text-slate-300 hover:bg-slate-700 bg-transparent"
                      onClick={() => setIsInviteDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Success Message */}
        {showSuccessMessage && (
          <Alert className="bg-emerald-500/20 border-emerald-500/30">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription className="text-emerald-400">
              Employee invitation sent successfully! The invitation will be processed and the employee will be notified.
            </AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white text-lg font-semibold flex items-center">
              <Filter className="w-5 h-5 mr-2 text-blue-400" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search" className="text-slate-300">Search Employees</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <Input
                    id="search"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-slate-800 border-slate-700 text-white focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status" className="text-slate-300">Status Filter</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all">All Employees</SelectItem>
                    <SelectItem value="active">Active Only</SelectItem>
                    <SelectItem value="inactive">Inactive Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error State */}
        {employeesError && (
          <Alert className="bg-red-500/20 border-red-500/30">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-400">
              Failed to load employees. Please try again.
            </AlertDescription>
          </Alert>
        )}

        {/* Employees Table */}
        <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-xl font-semibold flex items-center">
                <Users className="w-5 h-5 mr-2 text-purple-400" />
                Team Members
                {!employeesLoading && (
                  <Badge className="ml-3 bg-blue-500/20 text-blue-400 border-blue-500/30">
                    {employees.length} total
                  </Badge>
                )}
              </CardTitle>
            </div>
            <CardDescription className="text-slate-400">
              Manage your team members and their access
            </CardDescription>
          </CardHeader>
          <CardContent>
            {employeesLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Skeleton className="w-10 h-10 rounded-full bg-slate-700" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32 bg-slate-700" />
                        <Skeleton className="h-3 w-24 bg-slate-700" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-16 bg-slate-700" />
                  </div>
                ))}
              </div>
            ) : employees.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-700">
                      <TableHead className="text-slate-300">Employee</TableHead>
                      <TableHead className="text-slate-300">Department</TableHead>
                      <TableHead className="text-slate-300">Status</TableHead>
                      <TableHead className="text-slate-300">Spending Limit</TableHead>
                      <TableHead className="text-slate-300">Last Active</TableHead>
                      <TableHead className="text-slate-300">Joined</TableHead>
                      <TableHead className="text-slate-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((employee) => (
                      <TableRow key={employee.id} className="border-slate-700">
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                              <span className="text-purple-400 font-semibold">
                                {employee.firstName.charAt(0)}{employee.lastName.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="text-white font-medium">
                                {employee.firstName} {employee.lastName}
                              </p>
                              <p className="text-slate-400 text-sm">{employee.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {employee.department ? (
                            <Badge variant="outline" className="border-slate-600 text-slate-300">
                              {employee.department}
                            </Badge>
                          ) : (
                            <span className="text-slate-500">Not assigned</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(employee.status)}>
                            {employee.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {employee.spendingLimit ? (
                            formatCurrency(employee.spendingLimit, 'GHS')
                          ) : (
                            <span className="text-slate-500">No limit</span>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-400">
                          {employee.lastActive ? formatDate(employee.lastActive) : 'Never'}
                        </TableCell>
                        <TableCell className="text-slate-400">
                          {formatDate(employee.joinedAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/20"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-slate-400 hover:text-slate-300 hover:bg-slate-700"
                            >
                              <Settings className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Employees Yet</h3>
                <p className="text-slate-400 mb-6">
                  Start building your team by inviting employees to join your organization.
                </p>
                <Button
                  onClick={() => setIsInviteDialogOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite Your First Employee
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MerchantLayout>
  )
}

export default withRouteProtection(EmployeesPage, ['merchant'])
