import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import jwt from 'jsonwebtoken'

export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: { message: 'Authorization token required' } },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    
    // Parse request body to get token (if provided in body as well)
    const body = await request.json().catch(() => ({}))
    const tokenToVerify = body.token || token

    if (!tokenToVerify) {
      return NextResponse.json(
        { error: { message: 'Token required' } },
        { status: 400 }
      )
    }

    // Extract user ID from our simple token format: calvary_access_${timestamp}_${userId}
    let userId: string

    try {
      if (tokenToVerify.startsWith('calvary_access_')) {
        // Our simple token format: calvary_access_${timestamp}_${userId}
        const parts = tokenToVerify.split('_');
        if (parts.length >= 3) {
          userId = parts.slice(2).join('_'); // Handle UUIDs with underscores
        } else {
          console.error('Invalid token format - not enough parts');
          return NextResponse.json(
            { error: { message: 'Invalid token format' } },
            { status: 401 }
          )
        }
      } else {
        // Try JWT format as fallback
        const parts = tokenToVerify.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          userId = payload.userId || payload.sub || payload.id;
        } else {
          console.error('Unknown token format');
          return NextResponse.json(
            { error: { message: 'Unknown token format' } },
            { status: 401 }
          )
        }
      }
    } catch (decodeError) {
      console.error('Token decode failed:', decodeError);
      return NextResponse.json(
        { error: { message: 'Token decode failed' } },
        { status: 401 }
      )
    }

    if (!userId) {
      console.error('No user ID found in token');
      return NextResponse.json(
        { error: { message: 'No user ID found in token' } },
        { status: 401 }
      )
    }

    // Get user from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, phone, role, is_active, email_verified, phone_verified, created_at, updated_at')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      console.error('User fetch error:', userError)
      return NextResponse.json(
        { error: { message: 'User not found' } },
        { status: 404 }
      )
    }

    // Check if user is active
    if (!user.is_active) {
      return NextResponse.json(
        { error: { message: 'User account is inactive' } },
        { status: 403 }
      )
    }

    // Format user data
    const userData = {
      id: user.id,
      userId: user.id, // Add userId for compatibility
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      role: user.role,
      isActive: user.is_active,
      emailVerified: user.email_verified,
      phoneVerified: user.phone_verified,
      createdAt: user.created_at,
      updatedAt: user.updated_at
    }

    return NextResponse.json({
      success: true,
      user: userData
    })

  } catch (error) {
    console.error('Token verification error:', error)
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    { error: { message: 'Method not allowed' } },
    { status: 405 }
  )
}
