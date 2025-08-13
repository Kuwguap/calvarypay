/**
 * Supabase Client Configuration for CalvaryPay Web App
 * Handles database operations and authentication
 */

import { createClient } from '@supabase/supabase-js'
import { config } from './config'

// Database types based on our schema
export interface DatabaseUser {
  id: string
  email: string
  phone?: string
  password_hash: string
  first_name?: string
  last_name?: string
  role?: string // We'll add this field to the schema
  is_active: boolean
  email_verified: boolean
  phone_verified: boolean
  created_at: string
  updated_at: string
}

export interface DatabaseRole {
  id: number
  name: string
  description?: string
  permissions: any[]
  created_at: string
}

export interface UserRole {
  user_id: string
  role_id: number
  assigned_at: string
  assigned_by?: string
}

// Create Supabase client
export const supabase = createClient(
  config.supabase.url,
  config.supabase.anonKey,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
)

// Service client for admin operations (requires service role key)
export const createServiceClient = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for service operations')
  }
  
  return createClient(
    config.supabase.url,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Password hashing utility (using bcrypt for production)
const bcrypt = require('bcryptjs')

const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12
  return await bcrypt.hash(password, saltRounds)
}

const verifyPassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword)
}

// Database operations
export class SupabaseService {
  private client = supabase

  constructor() {
    console.log('🔗 Using Supabase database')
  }

  // Test database connection
  async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await this.client
        .from('calvary_users')
        .select('count')
        .limit(1)

      if (error) {
        console.error('Database connection test failed:', error)
        return false
      }

      console.log('✅ Database connection successful')
      return true
    } catch (error) {
      console.error('Database connection test failed:', error)
      return false
    }
  }
  
  // Create a new user
  async createUser(userData: {
    email: string
    password: string
    firstName: string
    lastName: string
    phone: string
    role: string
  }): Promise<{ user: DatabaseUser; error?: string }> {
    try {
      // Hash password using bcrypt
      const passwordHash = await hashPassword(userData.password)

      const { data, error } = await this.client
        .from('calvary_users')
        .insert([
          {
            email: userData.email,
            password_hash: passwordHash,
            first_name: userData.firstName,
            last_name: userData.lastName,
            phone: userData.phone,
            role: userData.role,
            is_active: true,
            email_verified: false,
            phone_verified: false
          }
        ])
        .select()
        .single()

      if (error) {
        console.error('Error creating user:', error)
        return { user: null as any, error: error.message }
      }

      console.log('✅ User created successfully:', data.id)
      return { user: data }
    } catch (error) {
      console.error('Error in createUser:', error)
      return { user: null as any, error: 'Failed to create user' }
    }
  }
  
  // Find user by email
  async findUserByEmail(email: string): Promise<{ user: DatabaseUser | null; error?: string }> {
    try {
      const { data, error } = await this.client
        .from('calvary_users')
        .select('*')
        .eq('email', email)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error finding user:', error)
        return { user: null, error: error.message }
      }

      return { user: data || null }
    } catch (error) {
      console.error('Error in findUserByEmail:', error)
      return { user: null, error: 'Failed to find user' }
    }
  }
  
  // Verify password using bcrypt
  async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return await verifyPassword(plainPassword, hashedPassword)
  }
  
  // Clear all test users (for development)
  async clearTestUsers(): Promise<void> {
    try {
      const { error } = await this.client
        .from('calvary_users')
        .delete()
        .like('email', '%@example.com')

      if (error) {
        console.error('Error clearing test users:', error)
      } else {
        console.log('✅ Test users cleared from database')
      }
    } catch (error) {
      console.error('Error in clearTestUsers:', error)
    }
  }
}

// Export singleton instance
export const supabaseService = new SupabaseService()

// Export default client
export default supabase
