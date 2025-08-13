/**
 * Database Information API Route
 * Shows what tables and columns exist in the database
 */

import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    console.log('🔍 Checking database information...')
    
    // Try to get table information
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_table_info')
    
    if (tablesError) {
      console.log('RPC failed, trying direct query...')
      
      // Try a simple query to see what happens
      const { data: testData, error: testError } = await supabase
        .from('users')
        .select('*')
        .limit(1)
      
      if (testError) {
        console.log('Users table test error:', testError)
        
        // Check if any tables exist
        const { data: anyData, error: anyError } = await supabase
          .from('_realtime_schema')
          .select('*')
          .limit(1)
        
        return NextResponse.json({
          message: 'Database diagnostic results',
          usersTableExists: false,
          usersTableError: testError.message,
          realtimeSchemaTest: anyError ? 'Failed' : 'Success',
          recommendation: 'The users table needs to be created manually in Supabase SQL Editor'
        })
      }
      
      return NextResponse.json({
        message: 'Database diagnostic results',
        usersTableExists: true,
        usersTableData: testData,
        recommendation: 'Users table exists and is accessible'
      })
    }
    
    return NextResponse.json({
      message: 'Database diagnostic results',
      tables: tables,
      recommendation: 'Database schema information retrieved successfully'
    })
    
  } catch (error) {
    console.error('❌ Database diagnostic error:', error)
    
    return NextResponse.json({
      message: 'Database diagnostic failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      recommendation: 'Check Supabase connection and credentials'
    }, { status: 500 })
  }
}
