/**
 * Check Database Schema API Route
 * Attempts to determine what columns exist in the users table
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    console.log('🔍 Checking users table schema...')
    
    // Try to insert a minimal record to see what columns are required/available
    const testData = {
      email: 'schema.test@example.com',
      password_hash: 'test_hash'
    }
    
    const { data, error } = await supabase
      .from('users')
      .insert([testData])
      .select()
    
    if (error) {
      console.log('Insert error:', error)
      
      // Try with different column combinations
      const tests = [
        { email: 'test1@example.com' },
        { email: 'test2@example.com', password: 'test' },
        { email: 'test3@example.com', encrypted_password: 'test' },
        { email: 'test4@example.com', password_digest: 'test' }
      ]
      
      const results = []
      
      for (const test of tests) {
        const { data: testData, error: testError } = await supabase
          .from('users')
          .insert([test])
          .select()
        
        results.push({
          test: test,
          success: !testError,
          error: testError?.message
        })
        
        if (!testError) {
          // Clean up successful test
          await supabase
            .from('users')
            .delete()
            .eq('email', test.email)
        }
      }
      
      return NextResponse.json({
        message: 'Schema test results',
        originalError: error.message,
        testResults: results,
        recommendation: 'The users table exists but has a different schema than expected'
      })
    }
    
    // Clean up test data
    await supabase
      .from('users')
      .delete()
      .eq('email', 'schema.test@example.com')
    
    return NextResponse.json({
      message: 'Schema test successful',
      insertedData: data,
      recommendation: 'The users table accepts the expected schema'
    })
    
  } catch (error) {
    console.error('❌ Schema check error:', error)
    
    return NextResponse.json({
      message: 'Schema check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
