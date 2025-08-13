/**
 * Enhanced Authentication Middleware for CalvaryPay
 * Implements JWT refresh token rotation, blacklisting, and secure session management
 */

import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { supabaseService } from '@/lib/supabase'
import { enhancedSecurityService } from '@/lib/security/enhanced-security.service'
import { UserRole } from '@/lib/security/idor-protection'

interface TokenPayload {
  userId: string
  email: string
  role: UserRole
  sessionId: string
  iat: number
  exp: number
}

interface RefreshTokenData {
  userId: string
  sessionId: string
  tokenFamily: string
  issuedAt: Date
  expiresAt: Date
  isRevoked: boolean
}

export class EnhancedAuthMiddleware {
  private static instance: EnhancedAuthMiddleware
  private blacklistedTokens = new Set<string>()
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production'
  private readonly REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET || 'fallback-refresh-secret'
  private readonly ACCESS_TOKEN_EXPIRY = '15m'
  private readonly REFRESH_TOKEN_EXPIRY = '7d'

  static getInstance(): EnhancedAuthMiddleware {
    if (!EnhancedAuthMiddleware.instance) {
      EnhancedAuthMiddleware.instance = new EnhancedAuthMiddleware()
    }
    return EnhancedAuthMiddleware.instance
  }

  /**
   * Generate access and refresh token pair
   */
  async generateTokenPair(userId: string, email: string, role: UserRole): Promise<{
    accessToken: string
    refreshToken: string
    sessionId: string
  }> {
    const sessionId = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).substring(2, 15)
    const tokenFamily = globalThis.crypto?.randomUUID?.() || Math.random().toString(36).substring(2, 15)

    // Generate access token
    const accessTokenPayload: Omit<TokenPayload, 'iat' | 'exp'> = {
      userId,
      email,
      role,
      sessionId
    }

    const accessToken = jwt.sign(accessTokenPayload, this.JWT_SECRET, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
      issuer: 'CalvaryPay-auth',
      audience: 'CalvaryPay-services'
    })

    // Generate refresh token
    const refreshTokenPayload = {
      userId,
      sessionId,
      tokenFamily,
      type: 'refresh'
    }

    const refreshToken = jwt.sign(refreshTokenPayload, this.REFRESH_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRY,
      issuer: 'CalvaryPay-auth',
      audience: 'CalvaryPay-services'
    })

    // Store refresh token in database
    await this.storeRefreshToken({
      userId,
      sessionId,
      tokenFamily,
      issuedAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      isRevoked: false
    })

    return { accessToken, refreshToken, sessionId }
  }

  /**
   * Verify access token
   */
  async verifyAccessToken(token: string): Promise<{ valid: boolean; payload?: TokenPayload; error?: string }> {
    try {
      // Check if token is blacklisted
      if (this.blacklistedTokens.has(token)) {
        return { valid: false, error: 'Token has been revoked' }
      }

      // Verify JWT signature and expiration
      const payload = jwt.verify(token, this.JWT_SECRET, {
        issuer: 'CalvaryPay-auth',
        audience: 'CalvaryPay-services'
      }) as TokenPayload

      // Additional validation
      if (!payload.userId || !payload.email || !payload.role || !payload.sessionId) {
        return { valid: false, error: 'Invalid token payload' }
      }

      // Check if session is still active
      const sessionActive = await this.isSessionActive(payload.sessionId)
      if (!sessionActive) {
        return { valid: false, error: 'Session has been terminated' }
      }

      return { valid: true, payload }
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return { valid: false, error: 'Token has expired' }
      }
      if (error instanceof jwt.JsonWebTokenError) {
        return { valid: false, error: 'Invalid token' }
      }
      return { valid: false, error: 'Token verification failed' }
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<{
    success: boolean
    accessToken?: string
    newRefreshToken?: string
    error?: string
  }> {
    try {
      // Verify refresh token
      const payload = jwt.verify(refreshToken, this.REFRESH_SECRET) as any

      if (payload.type !== 'refresh') {
        return { success: false, error: 'Invalid refresh token type' }
      }

      // Check if refresh token exists and is not revoked
      const storedToken = await this.getRefreshToken(payload.sessionId, payload.tokenFamily)
      if (!storedToken || storedToken.isRevoked) {
        // Potential token theft - revoke all tokens for this user
        await this.revokeAllUserTokens(payload.userId)
        return { success: false, error: 'Refresh token has been revoked' }
      }

      // Get user details
      const { data: user, error: userError } = await supabaseService.client
        .from('users')
        .select('id, email, role, is_active')
        .eq('id', payload.userId)
        .single()

      if (userError || !user || !user.is_active) {
        return { success: false, error: 'User not found or inactive' }
      }

      // Revoke old refresh token
      await this.revokeRefreshToken(payload.sessionId, payload.tokenFamily)

      // Generate new token pair
      const newTokens = await this.generateTokenPair(user.id, user.email, user.role)

      return {
        success: true,
        accessToken: newTokens.accessToken,
        newRefreshToken: newTokens.refreshToken
      }
    } catch (error) {
      return { success: false, error: 'Invalid refresh token' }
    }
  }

  /**
   * Revoke access token (add to blacklist)
   */
  async revokeAccessToken(token: string): Promise<void> {
    this.blacklistedTokens.add(token)
    
    // Clean up blacklist periodically (remove expired tokens)
    if (this.blacklistedTokens.size > 10000) {
      this.cleanupBlacklist()
    }
  }

  /**
   * Revoke all tokens for a user (logout from all devices)
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    try {
      // Revoke all refresh tokens for user
      await supabaseService.client
        .from('refresh_tokens')
        .update({ is_revoked: true })
        .eq('user_id', userId)

      // Log security event
      await enhancedSecurityService.logSecurityEvent({
        eventType: 'suspicious_activity',
        userId,
        userRole: 'customer',
        resource: 'auth',
        action: 'all_tokens_revoked',
        details: { reason: 'potential_token_theft' },
        riskLevel: 'high'
      })
    } catch (error) {
      console.error('Failed to revoke user tokens:', error)
    }
  }

  /**
   * Authentication middleware for API routes
   */
  async authenticateRequest(request: NextRequest): Promise<{
    authenticated: boolean
    user?: TokenPayload
    response?: NextResponse
  }> {
    try {
      // Extract token from Authorization header
      const authHeader = request.headers.get('authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        return {
          authenticated: false,
          response: NextResponse.json(
            { error: 'Authorization token required' },
            { status: 401 }
          )
        }
      }

      const token = authHeader.substring(7)
      const verification = await this.verifyAccessToken(token)

      if (!verification.valid) {
        return {
          authenticated: false,
          response: NextResponse.json(
            { error: verification.error || 'Invalid token' },
            { status: 401 }
          )
        }
      }

      return {
        authenticated: true,
        user: verification.payload
      }
    } catch (error) {
      return {
        authenticated: false,
        response: NextResponse.json(
          { error: 'Authentication failed' },
          { status: 500 }
        )
      }
    }
  }

  // Private helper methods
  private async storeRefreshToken(tokenData: RefreshTokenData): Promise<void> {
    try {
      await supabaseService.client
        .from('refresh_tokens')
        .insert([{
          user_id: tokenData.userId,
          session_id: tokenData.sessionId,
          token_family: tokenData.tokenFamily,
          issued_at: tokenData.issuedAt.toISOString(),
          expires_at: tokenData.expiresAt.toISOString(),
          is_revoked: tokenData.isRevoked
        }])
    } catch (error) {
      console.error('Failed to store refresh token:', error)
      throw new Error('Token storage failed')
    }
  }

  private async getRefreshToken(sessionId: string, tokenFamily: string): Promise<RefreshTokenData | null> {
    try {
      const { data, error } = await supabaseService.client
        .from('refresh_tokens')
        .select('*')
        .eq('session_id', sessionId)
        .eq('token_family', tokenFamily)
        .single()

      if (error || !data) return null

      return {
        userId: data.user_id,
        sessionId: data.session_id,
        tokenFamily: data.token_family,
        issuedAt: new Date(data.issued_at),
        expiresAt: new Date(data.expires_at),
        isRevoked: data.is_revoked
      }
    } catch (error) {
      return null
    }
  }

  private async revokeRefreshToken(sessionId: string, tokenFamily: string): Promise<void> {
    try {
      await supabaseService.client
        .from('refresh_tokens')
        .update({ is_revoked: true })
        .eq('session_id', sessionId)
        .eq('token_family', tokenFamily)
    } catch (error) {
      console.error('Failed to revoke refresh token:', error)
    }
  }

  private async isSessionActive(sessionId: string): Promise<boolean> {
    try {
      const { data, error } = await supabaseService.client
        .from('refresh_tokens')
        .select('is_revoked')
        .eq('session_id', sessionId)
        .eq('is_revoked', false)
        .single()

      return !error && !!data
    } catch (error) {
      return false
    }
  }

  private cleanupBlacklist(): void {
    // This is a simple cleanup - in production, you'd want more sophisticated cleanup
    // based on token expiration times
    if (this.blacklistedTokens.size > 5000) {
      this.blacklistedTokens.clear()
    }
  }
}

export const enhancedAuthMiddleware = EnhancedAuthMiddleware.getInstance()
