"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Skeleton } from "@/components/ui/skeleton"
import {
  CheckCircle,
  AlertCircle,
  Building2,
  Users,
  Mail,
  Calendar,
  ArrowRight,
  Loader2
} from "lucide-react"
import { useAuth } from "@/lib/hooks/use-auth"
import { formatDate } from "@/lib/utils"
import Link from "next/link"

// Types
interface InvitationDetails {
  id: string
  email: string
  firstName: string
  lastName: string
  companyName: string
  invitedBy: string
  department?: string
  spendingLimit?: number
  expiresAt: string
  invitationType: 'existing_user' | 'new_user'
}

export default function AcceptInvitationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isAuthenticated } = useAuth()
  
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAccepting, setIsAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const token = searchParams.get('token')

  // Fetch invitation details
  useEffect(() => {
    const fetchInvitation = async () => {
      if (!token) {
        setError('Invalid invitation link')
        setIsLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/auth/invitation-details?token=${token}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error?.message || 'Failed to fetch invitation details')
        }

        setInvitation(data.invitation)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load invitation')
      } finally {
        setIsLoading(false)
      }
    }

    fetchInvitation()
  }, [token])

  // Handle invitation acceptance
  const handleAcceptInvitation = async () => {
    if (!token || !invitation) return

    setIsAccepting(true)
    setError(null)

    try {
      const response = await fetch('/api/auth/accept-invitation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.accessToken && { 'Authorization': `Bearer ${user.accessToken}` })
        },
        body: JSON.stringify({ token })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to accept invitation')
      }

      setSuccess(true)
      
      // Redirect to employee dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard/employee')
      }, 2000)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invitation')
    } finally {
      setIsAccepting(false)
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-900 border-slate-800">
          <CardHeader>
            <Skeleton className="h-6 w-48 bg-slate-700" />
            <Skeleton className="h-4 w-64 bg-slate-700" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full bg-slate-700" />
            <Skeleton className="h-4 w-3/4 bg-slate-700" />
            <Skeleton className="h-10 w-full bg-slate-700" />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Error state
  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-red-400" />
              Invalid Invitation
            </CardTitle>
            <CardDescription className="text-slate-400">
              This invitation link is invalid or has expired
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="bg-red-500/20 border-red-500/30 mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-400">
                {error}
              </AlertDescription>
            </Alert>
            <div className="flex space-x-3">
              <Link href="/auth/signin" className="flex-1">
                <Button variant="outline" className="w-full border-slate-600 text-slate-300 hover:bg-slate-700">
                  Sign In
                </Button>
              </Link>
              <Link href="/" className="flex-1">
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  Go Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <CheckCircle className="w-5 h-5 mr-2 text-emerald-400" />
              Invitation Accepted!
            </CardTitle>
            <CardDescription className="text-slate-400">
              Welcome to the team! Redirecting to your dashboard...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="bg-emerald-500/20 border-emerald-500/30">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="text-emerald-400">
                You have successfully joined {invitation?.companyName}. You can now access your employee dashboard.
              </AlertDescription>
            </Alert>
            <div className="mt-4 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-blue-400 mr-2" />
              <span className="text-slate-300">Redirecting...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Main invitation display
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Building2 className="w-5 h-5 mr-2 text-blue-400" />
            Company Invitation
          </CardTitle>
          <CardDescription className="text-slate-400">
            You've been invited to join a company team
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {invitation && (
            <>
              {/* Invitation Details */}
              <div className="space-y-4">
                <div className="p-4 bg-slate-800/50 rounded-lg">
                  <h3 className="text-white font-semibold mb-3">Invitation Details</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Company:</span>
                      <span className="text-white font-medium">{invitation.companyName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Invited by:</span>
                      <span className="text-white">{invitation.invitedBy}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Your email:</span>
                      <span className="text-white">{invitation.email}</span>
                    </div>
                    {invitation.department && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Department:</span>
                        <Badge variant="outline" className="border-slate-600 text-slate-300">
                          {invitation.department}
                        </Badge>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Expires:</span>
                      <span className="text-white">{formatDate(invitation.expiresAt)}</span>
                    </div>
                  </div>
                </div>

                {/* User Status */}
                {invitation.invitationType === 'existing_user' ? (
                  <Alert className="bg-blue-500/20 border-blue-500/30">
                    <Users className="h-4 w-4" />
                    <AlertDescription className="text-blue-400">
                      You already have an account. Accepting this invitation will add you to the company team.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="bg-yellow-500/20 border-yellow-500/30">
                    <Mail className="h-4 w-4" />
                    <AlertDescription className="text-yellow-400">
                      You'll need to create an account to accept this invitation. Please sign up first.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Authentication Status */}
                {!isAuthenticated && invitation.invitationType === 'existing_user' && (
                  <Alert className="bg-orange-500/20 border-orange-500/30">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-orange-400">
                      Please sign in to your account to accept this invitation.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Error Display */}
              {error && (
                <Alert className="bg-red-500/20 border-red-500/30">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-red-400">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3">
                {isAuthenticated && invitation.invitationType === 'existing_user' ? (
                  <>
                    <Button
                      onClick={handleAcceptInvitation}
                      disabled={isAccepting}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    >
                      {isAccepting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Accepting...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Accept Invitation
                        </>
                      )}
                    </Button>
                    <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                      Decline
                    </Button>
                  </>
                ) : invitation.invitationType === 'new_user' ? (
                  <Link href={`/auth/signup?invitation=${token}`} className="flex-1">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Sign Up to Accept
                    </Button>
                  </Link>
                ) : (
                  <Link href={`/auth/signin?invitation=${token}`} className="flex-1">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700">
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Sign In to Accept
                    </Button>
                  </Link>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
