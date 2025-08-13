"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft, DollarSign, Users, CheckCircle, AlertCircle, Loader2, Calendar, Target } from "lucide-react"
import Link from "next/link"
import { MerchantLayout } from "@/components/dashboard/role-based-layout"
import { withRouteProtection } from "@/lib/auth/route-protection"
import { formatCurrency } from "@/lib/utils"

// Types
interface BudgetForm {
  employeeId: string
  amount: string
  currency: string
  budgetType: string
  description: string
  expiryDate: string
}

interface Employee {
  id: string
  firstName: string
  lastName: string
  email: string
  status: string
}

interface BudgetResponse {
  success: boolean
  data: {
    allocationId: string
    employeeId: string
    amount: number
    currency: string
    budgetType: string
    status: string
    message: string
  }
  error?: {
    message: string
  }
}

function BudgetAllocationPage() {
  const { user } = useAuth()
  const [formData, setBudgetForm] = useState<BudgetForm>({
    employeeId: "",
    amount: "",
    currency: "GHS",
    budgetType: "general",
    description: "",
    expiryDate: ""
  })
  const [isLoading, setIsLoading] = useState(false)
  const [response, setResponse] = useState<BudgetResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(true)

  // Fetch employees for the company
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch('/api/merchant/employees?limit=100', {
          headers: {
            'Authorization': `Bearer ${user?.accessToken}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const result = await response.json()
          setEmployees(result.employees || [])
        }
      } catch (err) {
        console.error('Failed to fetch employees:', err)
      } finally {
        setIsLoadingEmployees(false)
      }
    }

    if (user?.accessToken) {
      fetchEmployees()
    }
  }, [user?.accessToken])

  const handleInputChange = (field: keyof BudgetForm, value: string) => {
    setBudgetForm(prev => ({ ...prev, [field]: value }))
    setError(null)
    setResponse(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setResponse(null)

    try {
      const response = await fetch('/api/company/budget-allocation', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user?.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (response.ok) {
        setResponse(result)
        // Reset form on success
        setBudgetForm({
          employeeId: "",
          amount: "",
          currency: "GHS",
          budgetType: "general",
          description: "",
          expiryDate: ""
        })
      } else {
        setError(result.error?.message || 'Failed to allocate budget')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const isFormValid = formData.employeeId && formData.amount && parseFloat(formData.amount) > 0

  return (
    <MerchantLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/company">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Budget Allocation</h1>
            <p className="text-slate-400">Allocate budgets to your employees</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Budget Allocation Form */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <Target className="w-5 h-5 mr-2 text-purple-400" />
                  Allocate Budget
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Allocate budget to employees for expenses and operations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Employee Selection */}
                  <div className="space-y-2">
                    <Label htmlFor="employeeId" className="text-slate-300">
                      Select Employee
                    </Label>
                    <Select
                      value={formData.employeeId}
                      onValueChange={(value) => handleInputChange('employeeId', value)}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue placeholder="Choose an employee" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {isLoadingEmployees ? (
                          <SelectItem value="loading" disabled>
                            <Skeleton className="h-4 w-32 bg-slate-700" />
                          </SelectItem>
                        ) : employees.length === 0 ? (
                          <SelectItem value="no-employees" disabled>
                            No employees found
                          </SelectItem>
                        ) : (
                          employees.map((employee) => (
                            <SelectItem 
                              key={employee.id} 
                              value={employee.id}
                              className="text-white hover:bg-slate-700"
                            >
                              {employee.firstName} {employee.lastName} ({employee.email})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Amount */}
                  <div className="space-y-2">
                    <Label htmlFor="amount" className="text-slate-300">
                      Budget Amount
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="amount"
                        type="number"
                        placeholder="0.00"
                        value={formData.amount}
                        onChange={(e) => handleInputChange('amount', e.target.value)}
                        className="pl-10 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                        min="0.01"
                        step="0.01"
                        required
                      />
                    </div>
                  </div>

                  {/* Currency */}
                  <div className="space-y-2">
                    <Label htmlFor="currency" className="text-slate-300">
                      Currency
                    </Label>
                    <Select
                      value={formData.currency}
                      onValueChange={(value) => handleInputChange('currency', value)}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue placeholder="Select currency" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="GHS" className="text-white hover:bg-slate-700">
                          GHS - Ghanaian Cedi
                        </SelectItem>
                        <SelectItem value="NGN" className="text-white hover:bg-slate-700">
                          NGN - Nigerian Naira
                        </SelectItem>
                        <SelectItem value="USD" className="text-white hover:bg-slate-700">
                          USD - US Dollar
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Budget Type */}
                  <div className="space-y-2">
                    <Label htmlFor="budgetType" className="text-slate-300">
                      Budget Type
                    </Label>
                    <Select
                      value={formData.budgetType}
                      onValueChange={(value) => handleInputChange('budgetType', value)}
                    >
                      <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                        <SelectValue placeholder="Select budget type" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        <SelectItem value="general" className="text-white hover:bg-slate-700">
                          General Expenses
                        </SelectItem>
                        <SelectItem value="travel" className="text-white hover:bg-slate-700">
                          Travel & Transport
                        </SelectItem>
                        <SelectItem value="meals" className="text-white hover:bg-slate-700">
                          Meals & Entertainment
                        </SelectItem>
                        <SelectItem value="supplies" className="text-white hover:bg-slate-700">
                          Office Supplies
                        </SelectItem>
                        <SelectItem value="training" className="text-white hover:bg-slate-700">
                          Training & Development
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Expiry Date */}
                  <div className="space-y-2">
                    <Label htmlFor="expiryDate" className="text-slate-300">
                      Expiry Date (Optional)
                    </Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="expiryDate"
                        type="date"
                        value={formData.expiryDate}
                        onChange={(e) => handleInputChange('expiryDate', e.target.value)}
                        className="pl-10 bg-slate-800 border-slate-700 text-white"
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-slate-300">
                      Description (Optional)
                    </Label>
                    <Input
                      id="description"
                      placeholder="e.g., Q4 marketing budget, Monthly travel allowance"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                    />
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={!isFormValid || isLoading}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Allocating Budget...
                      </>
                    ) : (
                      <>
                        <Target className="w-4 h-4 mr-2" />
                        Allocate Budget
                      </>
                    )}
                  </Button>
                </form>

                {/* Error Display */}
                {error && (
                  <Alert className="mt-4 bg-red-500/20 border-red-500/30">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-red-400">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Success Display */}
                {response?.success && (
                  <Alert className="mt-4 bg-emerald-500/20 border-emerald-500/30">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription className="text-emerald-400">
                      {response.data.message}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Info Panel */}
          <div className="space-y-6">
            {/* Budget Info */}
            <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Budget Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <DollarSign className="w-5 h-5 text-purple-400" />
                  <div>
                    <p className="text-white font-medium">Budget Allocation</p>
                    <p className="text-slate-400 text-sm">Employee Budgets</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-700">
                  <p className="text-slate-400 text-sm">
                    Budgets allocated to employees can be used for:
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-slate-300">
                    <li>• Business expenses</li>
                    <li>• Travel and transport</li>
                    <li>• Office supplies</li>
                    <li>• Training and development</li>
                    <li>• Meals and entertainment</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Process Info */}
            <Card className="bg-slate-900/50 border-slate-800 shadow-xl backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">How It Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center">
                    <span className="text-purple-400 text-xs font-bold">1</span>
                  </div>
                  <p className="text-slate-300 text-sm">
                    Select an employee from your company
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center">
                    <span className="text-purple-400 text-xs font-bold">2</span>
                  </div>
                  <p className="text-slate-300 text-sm">
                    Set budget amount and type
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center">
                    <span className="text-purple-400 text-xs font-bold">3</span>
                  </div>
                  <p className="text-slate-300 text-sm">
                    Employee receives budget allocation
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center">
                    <span className="text-purple-400 text-xs font-bold">4</span>
                  </div>
                  <p className="text-slate-300 text-sm">
                    Monitor spending and usage
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MerchantLayout>
  )
}

export default withRouteProtection(BudgetAllocationPage, ['merchant', 'admin']) 